import { useState } from "react";
import { CarWriter } from "@ipld/car";
import { CommP, MerkleTree } from "@web3-storage/data-segment";
import { ethers } from "ethers";
import { CID } from "multiformats/cid";
import * as raw from 'multiformats/codecs/raw'
import { sha256 } from "multiformats/hashes/sha2";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { onRampContractAbi } from "~~/contracts/generated";

const ONRAMP_CONTRACT_ADDRESS_SRC_CHAIN = "0xACd64568CDDdF173d65ED6d3B304ad17E98Cca2F";
const WETH_ADDRESS = "0xb44cc5FB8CfEdE63ce1758CE0CDe0958A7702a16";

export const GetFileDealParams = () => {
  const [pieceSize, setPieceSize] = useState<number | null>(null);
  const [commP, setCommP] = useState<any | null>(null);
  const [ipfsUrl, setIpfsUrl] = useState<string | null>(null);
  const [cidStr, setCidStr] = useState<string | null>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("file", file);
      const carFile = await convertToCAR(file);
      setPieceSize(carFile.pieceSize);
      setCommP(carFile.commP);
      setIpfsUrl(carFile.ipfsUrl);
      setCidStr(carFile.cidStr);

      return carFile;
    }
  };

  const { data: hash, isPending, writeContract } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const handleSubmit = async () => {
    if (!pieceSize || !commP || !ipfsUrl || !cidStr) {
      console.error("Missing required data for the offer");
      return;
    }

    console.log("commP", commP);
    console.log("pieceSize", pieceSize);
    console.log("ipfsUrl", ipfsUrl);
    console.log("commP.size", commP.size);
    console.log("commP.merkleTree", commP.tree as MerkleTree);
    console.log("commP.tree.root", commP.tree.root);

    const serializedCommP = serializeCommP(commP.size, commP.tree as MerkleTree);

    const offer = {
      commP: serializedCommP as `0x${string}`,
      size: BigInt(pieceSize),
      cid: cidStr,
      location: ipfsUrl,
      amount: BigInt(0),
      token: WETH_ADDRESS as `0x${string}`,
    };

    try {
      writeContract({
        address: ONRAMP_CONTRACT_ADDRESS_SRC_CHAIN,
        abi: onRampContractAbi,
        functionName: "offerData",
        args: [offer],
      });
    } catch (error) {
      console.error("Error sending transaction:", error);
    }
  };

  return (
    <>
      <input
        type="file"
        onChange={handleUpload}
        // accept everything
        accept={"*"}
        className="file-input border-base-300 border shadow-md shadow-secondary rounded-3xl"
      />
      <button onClick={handleSubmit}>Submit</button>
      {isPending && <div>Transaction pending...</div>}
      {isConfirming && <div>Confirming transaction...</div>}
      {isConfirmed && <div>Transaction confirmed!</div>}
      {hash && <div>Transaction hash: {hash}</div>}
    </>
  );
};

async function convertToCAR(file: File) {
  try {
    // const arrayBuffer = await readFileAsArrayBuffer(file);
    const arrayBuffer = await file.arrayBuffer();
    const fileContent = new Uint8Array(arrayBuffer);

    const cid = (await generateCID(fileContent));
    console.log("V1 cid String is: ",cid.toString());
    
    const commP = await generateCommP(fileContent);
    console.log("commP is: ",commP);

    const pieceSize = commP.pieceSize;
    console.log("pieceSize is: ",pieceSize);

    // Generating CAR for the uploaded file 
    const { writer, out } = CarWriter.create([cid]);
    writer.put({ cid, bytes: fileContent });
    writer.close();

    const carChunks: Uint8Array[] = [];
    for await (const chunk of out) {
      carChunks.push(chunk);
    }

    const ipfsResp = await uploadFileToIPFS(file);
    // const ipfsResp = await uploadToIPFS(carChunks);
    const ipfsUrl = ipfsResp.url;
    const cidStr = ipfsResp.cid;
    console.log("ipfsURL is: ",ipfsUrl);

    return { pieceSize, cidStr, commP, ipfsUrl };
  } catch (error) {
    console.error("Error creating CAR file:", error);
    throw error;
  }
}

function readFileAsArrayBuffer(file: File) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Generate a CID using sha256
async function generateCID(content: Uint8Array) {
  const bytes = raw.encode(content)
  const hash = await sha256.digest(bytes);
  return CID.createV1(raw.code, hash);
}

async function generateCommP(bytes: Uint8Array) {
  const commP = await CommP.build(bytes);
  return commP;
}

//Testing: if the CID matched the Predetermining CID when upload a file to pinata
async function uploadFileToIPFS(file: File) {
  try {
    const data = new FormData();
    data.append("file", file);

    const options = JSON.stringify({
      cidVersion: 1
    })
    data.append("pinataOptions", options);

    const pinataMetadata = JSON.stringify({
      name: "TestRegularFile",
    });
    data.append("pinataMetadata", pinataMetadata);

    console.log("start sending file to ipfs using Pinata");
    const apiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: data,
    });

    if (!res.ok) {
      throw new Error(`Failed to upload to IPFS: ${res.statusText}`);
    }

    const resData = await res.json();
    console.log(resData);
    console.log(CID.parse(resData.IpfsHash).toV1().toString());

    if ("IpfsHash" in resData) {
      const cid = resData.IpfsHash;
      const url = `ipfs://${cid}`;
      return {cid, url};
    }

    throw new Error(`No IPFS hash found in response: ${JSON.stringify(resData)}`);
  } catch (error) {
    console.error("Error uploading to IPFS:", error);
    throw error;
  }
}

const serializeCommP = (size: number, merkleTree: MerkleTree): `0x${string}` => {
  const sizeBytes = ethers.utils.hexZeroPad(ethers.utils.hexlify(BigInt(size)), 8);

  const merkleBytes = ethers.utils.arrayify(merkleTree.root);

  const combinedBytes = ethers.utils.concat([sizeBytes, merkleBytes]);
  return ethers.utils.hexlify(combinedBytes) as `0x${string}`;
};