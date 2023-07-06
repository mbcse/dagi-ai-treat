import lighthouse from "@lighthouse-web3/sdk";
const api_key = process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY;
const progressCallback = (progressData: any) => {
  const percentageDone =
    100 - parseFloat((progressData?.total / progressData?.uploaded)?.toFixed(2));
  console.log(percentageDone);
};

async function urlToFile(url: any, filename: any, mimeType: any) {
  const response = await fetch(url);
  const blob = await response.blob();
  console.log(blob)
  return new File([blob], filename, { type: mimeType });
}

export const uploadFile = async (file: any) => {
  console.log(file);
  const fileObj = await urlToFile(file, "nft123", 'png')
  console.log(fileObj)
  const output = await lighthouse.upload([fileObj], api_key, false, null, progressCallback);
  return "ipfs://" + output.data.Hash;
};

export const uploadJson = async (json: any) => {
  const output = await lighthouse.uploadText(JSON.stringify(json), api_key);
  return "ipfs://" + output.data.Hash;
};
