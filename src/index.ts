import { showHUD, Clipboard, getPreferenceValues } from "@raycast/api";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFileSync } from "node:fs";
import { parse } from "node:path";

type Preference = {
  AccountId: string;
  AccessKeyId: string;
  SecretAccessKey: string;
  Buket: string;
  Domain: string;
}
export default async function main() {

  const { AccountId, AccessKeyId, SecretAccessKey, Domain } = getPreferenceValues<Preference>();

  const client = new S3Client({
    endpoint: `https://${AccountId}.r2.cloudflarestorage.com`,
    apiVersion: "v3",
    region: "auto",
    credentials: {
      accessKeyId: AccessKeyId,
      secretAccessKey: SecretAccessKey,
    },
  });

  const { file } = await Clipboard.read();

  if (!file) {
    return await showHUD("剪贴板中没有图片");
  }

  const filePath = file.replace("file://", "");

  // 检查文件的后缀是不是图片
  let { ext } = parse(filePath);
  if (filePath.includes("1920x1080")) {
    ext = ".png";
  }

  if (![".png", ".jpg", ".jpeg", ".gif"].includes(ext)) {
    return await showHUD("剪贴板中的文件不是图片");
  }
  const ts = Date.now();
  return await client
    .send(
      new PutObjectCommand({
        Bucket: "img",
        Key: ts + ext,
        Body: readFileSync(`${decodeURIComponent(filePath)}`),
        ContentType: "image/" + ext.replace(".", ""),
      })
    )
    .then(async (res) => {
      if (res.$metadata.httpStatusCode === 200) {
        await Clipboard.copy(`https://${Domain}/${ts + ext}`);
        return await showHUD("上传成功, 已复制到剪贴板");
      }
    })
    .catch((err) => {
      console.log(err);
      return showHUD("上传失败" + err.message);
    });
}
