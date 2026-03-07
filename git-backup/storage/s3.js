// ══════════════════════════════════════════════════════════════════════════════
// S3 Storage Provider
// ══════════════════════════════════════════════════════════════════════════════

const AWS = require('aws-sdk');
const fs = require('fs');

class S3Storage {
  constructor() {
    this.name = 'AWS S3';
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });
    this.bucket = process.env.AWS_S3_BUCKET || 'axion-git-backups';
  }

  async upload(filePath, backupName) {
    const fileContent = fs.readFileSync(filePath);
    
    const params = {
      Bucket: this.bucket,
      Key: `${backupName}.enc`,
      Body: fileContent,
      ServerSideEncryption: 'AES256',
      StorageClass: 'STANDARD_IA'  // Infrequent Access
    };
    
    const result = await this.s3.upload(params).promise();
    console.log(`✅ Uploaded to S3: ${result.Location}`);
    
    return result;
  }

  async list() {
    const params = {
      Bucket: this.bucket,
      Prefix: 'axion-backup-'
    };
    
    const result = await this.s3.listObjectsV2(params).promise();
    return result.Contents;
  }

  async download(backupName, outputPath) {
    const params = {
      Bucket: this.bucket,
      Key: `${backupName}.enc`
    };
    
    const data = await this.s3.getObject(params).promise();
    fs.writeFileSync(outputPath, data.Body);
    
    console.log(`✅ Downloaded from S3: ${outputPath}`);
  }
}

module.exports = S3Storage;
