/**
 * description: 
 * 1. 遍历所有jsx文件，找到所有jsx元素
 * 2. 为每个jsx元素添加data-source-[X]属性，X为元素的类型，如data-source-id、data-source-path、data-source-file、data-source-line、data-source-tag、data-source-content
 */

import MagicString, { SourceMap } from "magic-string";
import path from "path";
import { parse } from "@babel/parser";
import { walk } from "estree-walker";
import type { Plugin } from "vite";
import type {
  JSXElement, 
  JSXOpeningElement, 
  JSXIdentifier, 
  JSXMemberExpression,
  JSXExpressionContainer,
  StringLiteral,
  JSXText,
} from "@babel/types";

// 定义一个通用节点接口，用于 estree-walker
interface ASTNode {
  type: string;
  // 使用更具体的类型替代 any
  [key: string]: string | number | boolean | null | undefined | ASTNode | ASTNode[] | Record<string, unknown>;
}

const VALID_EXTENSIONS = new Set([".jsx", ".tsx"]);
const FRAGMENT_NAMES = new Set(["Fragment", "React.Fragment"]);

// types
interface ElementContent {
  text?: string;
  placeholder?: string;
  className?: string;
  isStaticTextElement?: boolean;
}

interface ElementAttributes {
  [key: string]: string;
}

interface ProcessingStats {
  totalFiles: number;
  processedFiles: number;
  totalElements: number;
}

interface ElementInfo {
  name: string;
  attributes: ElementAttributes;
  content: ElementContent;
  line: number;
  col: number;
}

// element processor
class ElementProcessor {
  private isValidFile(id: string): boolean {
    return VALID_EXTENSIONS.has(path.extname(id)) && !id.includes("node_modules");
  }

  private isFragmentElement(elementName: string): boolean {
    return FRAGMENT_NAMES.has(elementName);
  }

  private extractElementName(jsxNode: JSXOpeningElement): string | null {
    if (jsxNode.name.type === "JSXIdentifier") {
      return (jsxNode.name as JSXIdentifier).name;
    } else if (jsxNode.name.type === "JSXMemberExpression") {
      const memberExpr = jsxNode.name as JSXMemberExpression;
      const objectName = (memberExpr.object as JSXIdentifier).name;
      const propertyName = (memberExpr.property as JSXIdentifier).name;
      return `${objectName}.${propertyName}`;
    }
    return null;
  }

  private extractAttributes(jsxNode: JSXOpeningElement): ElementAttributes {
    return jsxNode.attributes.reduce((acc: ElementAttributes, attr) => {
      if (attr.type === "JSXAttribute" && attr.name.type === "JSXIdentifier") {
        const attrName = attr.name.name as string;
        
        if (attr.value?.type === "StringLiteral") {
          acc[attrName] = (attr.value as StringLiteral).value;
        } else if (
          attr.value?.type === "JSXExpressionContainer" && 
          (attr.value as JSXExpressionContainer).expression.type === "StringLiteral"
        ) {
          const expression = (attr.value as JSXExpressionContainer).expression as StringLiteral;
          acc[attrName] = expression.value;
        }
      }
      return acc;
    }, {});
  }

  private extractTextContent(element: JSXElement | null): string {
    if (!element?.children) return "";

    return element.children
      .map((child) => {
        if (child.type === "JSXText") {
          return (child as JSXText).value.trim();
        } else if (child.type === "JSXExpressionContainer") {
          const container = child as JSXExpressionContainer;
          if (container.expression.type === "StringLiteral") {
            return (container.expression as StringLiteral).value;
          }
        }
        return "";
      })
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  // has only static text element
  private isStaticTextElement(element: JSXElement | null): boolean {
    if (!element?.children) return false;
    return element.children.length === 1 && element.children[0].type === "JSXText" && (element.children[0] as JSXText).value.trim().length > 0;
  }

  private buildElementContent(textContent: string, attributes: ElementAttributes, isStaticTextElement: boolean): ElementContent {
    const content: ElementContent = {};
    
    if (textContent) {
      content.text = textContent;
    }
    if (isStaticTextElement) {
      content.isStaticTextElement = true;
    }
    if (attributes.placeholder) {
      content.placeholder = attributes.placeholder;
    }
    if (attributes.className) {
      content.className = attributes.className;
    }
    
    return content;
  }

  private generateDataAttributes(
    elementInfo: ElementInfo,
    dataComponentId: string,
    relativePath: string,
    fileName: string
  ): string {
    const { name, content } = elementInfo;
    const legacyAttributes = [
      `data-source-path="${relativePath}"`,
      `data-source-file="${fileName}"`,
      `data-source-line="${elementInfo.line}"`,
      `data-source-col="${elementInfo.col}"`,
      `data-source-tag="${name}"`,
      `data-source-ext="${encodeURIComponent(JSON.stringify(content))}"`
    ].join(" ");

    return ` data-source-id="${dataComponentId}" ${legacyAttributes}`;
  }

  public processFile(code: string, id: string): { code: string; map: SourceMap; changedElementsCount: number } | null {
    if (!this.isValidFile(id)) {
      return null;
    }

    const cwd = process.cwd();
    const relativePath = path.relative(cwd, id);
    const fileName = path.basename(id);

    try {
      const ast = parse(code, {
        sourceType: "module",
        plugins: ["jsx", "typescript"]
      });

      const magicString = new MagicString(code);
      let changedElementsCount = 0;
      let currentElement: JSXElement | null = null;

      // @ts-expect-error - estree-walker 类型与 babel AST 类型不兼容
      walk(ast, {
        enter: (node: ASTNode) => {
          if (node.type === "JSXElement") {
            currentElement = node as unknown as JSXElement;
          }

          if (node.type === "JSXOpeningElement") {
            const jsxNode = node as unknown as JSXOpeningElement;
            const elementName = this.extractElementName(jsxNode);

            if (!elementName || this.isFragmentElement(elementName)) {
              return;
            }

            const attributes = this.extractAttributes(jsxNode);
            const textContent = this.extractTextContent(currentElement);
            const isStaticTextElement = this.isStaticTextElement(currentElement);
            const content = this.buildElementContent(textContent, attributes, isStaticTextElement);

            const line = jsxNode.loc?.start?.line ?? 0;
            const col = jsxNode.loc?.start?.column ?? 0;
            const dataComponentId = `${relativePath}:${line}:${col}`;

            const elementInfo: ElementInfo = {
              name: elementName,
              attributes,
              content,
              line,
              col
            };

            const dataAttributes = this.generateDataAttributes(
              elementInfo,
              dataComponentId,
              relativePath,
              fileName
            );

            magicString.appendLeft(jsxNode.name.end ?? 0, dataAttributes);
            changedElementsCount++;
          }
        }
      });

      return {
        code: magicString.toString(),
        map: magicString.generateMap({ hires: true }),
        changedElementsCount
      };
    } catch (error) {
      console.error(`Error processing file ${relativePath}:`, error);
      return null;
    }
  }
}

// main plugin
export const sourceInjector = (): Plugin => {
  const processor = new ElementProcessor();
  const stats: ProcessingStats = {
    totalFiles: 0,
    processedFiles: 0,
    totalElements: 0
  };

  return {
    name: "vite-plugin-source-injector",
    enforce: "pre",
    
    async transform(code: string, id: string) {
      stats.totalFiles++;
      
      const result = processor.processFile(code, id);
      
      if (result) {
        stats.processedFiles++;
        stats.totalElements += result.changedElementsCount;
      }
      
      return result;
    },

    // optional: add stats output after build
    buildEnd() {
      console.log(`Source Injector Stats:`, stats);
    }
  };
};
