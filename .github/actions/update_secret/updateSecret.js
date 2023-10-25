import * as sodium from "libsodium-wrappers";

const keyInfoPromise = fetch(
  `https://api.github.com/repos/${process.argv[4]}/actions/secrets/public-key`,
  {
    headers: {
      "Accept": "application/vnd.github.v3+json",
      "Authorization": `Bearer ${process.argv[3]}`,
      "User-Agent": "Github Secret Updater",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  },
);

await sodium.ready;
const binsec = sodium.from_string(process.argv[2]);
const keyInfo = (await keyInfoPromise).json();
const binkey = sodium.from_base64(keyInfo.key, sodium.base64_variants.ORIGINAL);
const encBytes = sodium.crypto_box_seal(binsec, binkey);
const encryptedBase64 = sodium.to_base64(
  encBytes,
  sodium.base64_variants.ORIGINAL,
);

await fetch(
  `https://api.github.com/repos/${process.argv[4]}/actions/secrets/${process.argv[5]}`,
  {
    method: "PUT",
    headers: {
      "Accept": "application/vnd.github.v3+json",
      "Authorization": `Bearer ${process.argv[3]}`,
      "User-Agent": "Github Secret Updater",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: `{"encrypted_value":"${encryptedBase64}","key_id":"${keyInfo.key_id}"}`,
  },
);
