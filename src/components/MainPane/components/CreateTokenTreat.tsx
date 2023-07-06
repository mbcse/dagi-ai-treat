import {
  type FC,
  type ChangeEvent,
  type MouseEvent,
  useEffect,
  useState,
  useCallback,
} from "react";

import { Box, Button, Flex, Image, Input, Select, Text, VStack, useToken } from "@chakra-ui/react";
import { getAttestations } from "@coinbase/onchainkit/identity";
import { TokenSearch, TokenSelectDropdown, getTokens } from "@coinbase/onchainkit/token";
import type { Token } from "@coinbase/onchainkit/token";
import axios from "axios";
import { ethers } from "ethers";
import { baseSepolia } from "viem/chains";
import { useAccount, useChainId, useReadContract, useWriteContract } from "wagmi";

import { TOKEN_TREAT_CONTRACT_ADDRESS, TOKEN_TREAT_ABI, ERC20ABI } from "@/config";
import { useSignMessageHook, useNotify } from "@/hooks";
import type { ContractAddress } from "@/types";
import { getDefaultEthersSigner, getEthersSigner } from "@/utils/clientToEtherjsSigner";
import { uploadFile, uploadJson } from "@/utils/ipfsHelper";
import { createMetaData } from "@/utils/nftHelpers";
import { convertToUnixTimestamp } from "@/utils/timeUtils";

import LoadingScreen from "./LoadingScreen";

const CreateTokenTreat: FC = () => {
  const account = useAccount();
  const chainId = useChainId();
  const tokenTreatContractAddress = TOKEN_TREAT_CONTRACT_ADDRESS[chainId];

  const [treatName, setTreatName] = useState("");
  const [treatValue, setTreatValue] = useState("");
  const [treatType, setTreatType] = useState("");
  const [treatDescription, setTreatDescription] = useState("");
  const [treatImage, setTreatImage] = useState<FileList | null>(null);
  const [treatValidity, setTreatValidity] = useState("");
  const [treatToken, setTreatToken] = useState("");
  const [burnOnClaims, setburnOnClaim] = useState("");
  const [refundTreasury, setRefundTreasury] = useState("");
  const [transferable, setTransferable] = useState("");
  const [receipients, setReceipients] = useState("");
  const [platformFee, setPlatformFee] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [totalChargeableAmount, setTotalChargeableAmount] = useState("");

  const [imagePromt, setImagePromt] = useState("");

  const [imagePromtUrl, setImagePromtUrl] = useState("");

  const [selectTokenList, setSelectTokenList] = useState([
    {
      name: "Ethereum",
      address: "0x0000000000000000000000000000000000000000",
      symbol: "ETH",
      decimals: 18,
      image: "https://wallet-api-production.s3.amazonaws.com/uploads/tokens/eth_288.png",
      chainId: 8453,
    },
    {
      name: "USDC",
      address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      symbol: "USDC",
      decimals: 6,
      image:
        "https://d3r81g40ycuhqg.cloudfront.net/wallet/wais/44/2b/442b80bd16af0c0d9b22e03a16753823fe826e5bfd457292b55fa0ba8c1ba213-ZWUzYjJmZGUtMDYxNy00NDcyLTg0NjQtMWI4OGEwYjBiODE2",
      chainId: 8453,
    },
    {
      name: "Dai",
      address: "0x4e64812e093167EbA03b829284C1C959CC28DA72",
      symbol: "DAI",
      decimals: 18,
      image:
        "https://d3r81g40ycuhqg.cloudfront.net/wallet/wais/d0/d7/d0d7784975771dbbac9a22c8c0c12928cc6f658cbcf2bbbf7c909f0fa2426dec-NmU4ZWViMDItOTQyYy00Yjk5LTkzODUtNGJlZmJiMTUxOTgy",
      chainId: 8453,
    },
  ]);

  const [selectTreatToken, setSelectTreatToken] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const getTokenData = async () => {
    const signer = await getDefaultEthersSigner();
    let tokenContract = null;
    let tokenDecimals = null;
    let tokenSymbol = null;
    if (treatToken === "0x0000000000000000000000000000000000000000") {
      tokenDecimals = 18;
      tokenSymbol = "ETH";
    } else {
      // Get token Contract
      tokenContract = new ethers.Contract(treatToken, ERC20ABI, signer);
      // Get Token Decimal
      tokenDecimals = await tokenContract.decimals();

      // Get Token Symbol
      tokenSymbol = await tokenContract.symbol();
    }

    return { tokenContract, tokenDecimals, tokenSymbol };
  };

  const checkAndSetAmounts = async () => {
    if (!treatValue || treatValue === "" || !treatToken || treatToken === "") return;
    const signer = await getDefaultEthersSigner();

    const { tokenDecimals, tokenSymbol } = await getTokenData();

    // Get Token Treat Contract
    const tokenTreatContract = new ethers.Contract(
      tokenTreatContractAddress,
      TOKEN_TREAT_ABI,
      signer,
    );

    // Convert Treat amount in decimals
    const treatAmountInUnits = ethers.parseUnits(treatValue, tokenDecimals);
    // Get Platform fee
    const platformFeeInUnits = await tokenTreatContract.calculatePlatformFee(treatAmountInUnits);

    // Get Total Fee
    const totalAmountinUnits = treatAmountInUnits + platformFeeInUnits;

    console.log(`Total amount in units: ${totalAmountinUnits}`);

    // Set the Platform Fee
    setPlatformFee(ethers.formatUnits(platformFeeInUnits, tokenDecimals));
    console.log(`Platform Fee: ${ethers.formatUnits(platformFeeInUnits, tokenDecimals)}`);
    // Set the Token Symbol
    setTokenSymbol(tokenSymbol);
    // Set the Total Chargeable Amount
    setTotalChargeableAmount(ethers.formatUnits(totalAmountinUnits, tokenDecimals));
    console.log(
      `Total Chargeable Amount: ${ethers.formatUnits(totalAmountinUnits, tokenDecimals)}`,
    );
  };

  useEffect(() => {
    if (selectTreatToken) {
      setTreatToken(selectTreatToken.address);
    }
  }, [selectTreatToken]);

  useEffect(() => {
    const fetchTokenData = async () => {
      try {
        if (treatToken) {
          const tokenData = await getTokenData();
          const checkList = selectTokenList.filter((token) => {
            return token.address === treatToken;
          });

          if (checkList.length === 0) {
            console.log("Token Not Found");
            setSelectTokenList([
              ...selectTokenList,
              {
                name: tokenData.tokenSymbol,
                address: treatToken,
                symbol: tokenData.tokenSymbol,
                decimals: tokenData.tokenDecimals,
                image: "",
                chainId: chainId,
              },
            ]);

            setSelectTreatToken({
              name: tokenData.tokenSymbol,
              address: treatToken,
              symbol: tokenData.tokenSymbol,
              decimals: tokenData.tokenDecimals,
              image: "",
              chainId: chainId,
            });
          }
        }
      } catch (error) {
        console.log(error);
      }
    };
    fetchTokenData();
  }, [treatToken]);

  useEffect(() => {
    checkAndSetAmounts();
  }, [treatValue, treatToken]);

  useEffect(() => {
    const getUserData = async () => {
      if (receipients) {
        const receipientsAddresses = receipients.split(",");
        console.log(receipientsAddresses);

        const COINBASE_VERIFIED_ACCOUNT_SCHEMA_ID =
          "0x2f34a2ffe5f87b2f45fbc7c784896b768d77261e2f24f77341ae43751c765a69";

        const address = receipientsAddresses[0] as string;
        const attestationsOptions = {
          schemas: [COINBASE_VERIFIED_ACCOUNT_SCHEMA_ID],
        };

        const attestations = await getAttestations(address, baseSepolia, attestationsOptions);

        console.log(attestations);
      }
    };
    getUserData();
  }, [receipients]);

  const { notifyError, notifySuccess } = useNotify();

  const createImage = async () => {
    const options = {
      method: "POST",
      url: "/api/corcel",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        Authorization: "3ff413ba-70e0-4e3b-9de4-ec02b21525e1",
      },
      data: {
        imagePromt: imagePromt,
      },
    };

    const response = await axios.request(options);
    console.log(response.data)
    setImagePromtUrl(response.data[0].image_url);
    console.log(imagePromtUrl)
    return response.data;
  };

  useEffect(() => {
    if (imagePromt && imagePromt !== "") {
      createImage();
    }
  }, [imagePromt]);

  const createTreat = async () => {
    setIsLoading(true);
    // const imageData = await createImage()
    const signer = await getDefaultEthersSigner();
    const tokenTreatContract = new ethers.Contract(
      tokenTreatContractAddress,
      TOKEN_TREAT_ABI,
      signer,
    );
    try {
      const { tokenContract, tokenDecimals } = await getTokenData();
      console.log(totalChargeableAmount);
      const totalChargeableAmountInUnits = ethers.parseUnits(totalChargeableAmount, tokenDecimals);

      if (tokenContract) {
        const currentAllowance = await tokenContract.allowance(
          account.address,
          TOKEN_TREAT_CONTRACT_ADDRESS[chainId],
        );
        if (currentAllowance < totalChargeableAmountInUnits) {
          const tx = await tokenContract.approve(
            tokenTreatContractAddress,
            totalChargeableAmountInUnits,
          );
          await tx.wait();
        }
      }

      const treatImageHash = await uploadFile(imagePromtUrl);
      console.log(treatImageHash);
      const metadata = createMetaData(
        treatImageHash,
        treatDescription,
        treatType,
        treatValidity,
        {},
      );
      const metadataHash = await uploadJson(metadata);
      console.log(metadataHash);

      const receipientsAddresses = receipients.split(",");

      const treatValueInUnits = ethers.parseUnits(treatValue, tokenDecimals);

      if (receipientsAddresses.length == 0) {
        notifyError({ title: "Error", message: "Please enter a receipient address" });
      } else if (receipientsAddresses.length == 1) {
        console.log("tokenContract", tokenContract);
        const tx = await tokenTreatContract.mintTreat(
          receipientsAddresses[0].trim(),
          metadataHash,
          convertToUnixTimestamp(treatValidity),
          treatValueInUnits,
          treatToken,
          refundTreasury,
          burnOnClaims === "true",
          transferable === "true",
          treatType,
          { value: tokenContract ? 0 : totalChargeableAmountInUnits },
        );
        console.log(tx);
        await tx.wait();
        notifySuccess({
          title: "Success",
          message: "Treat created successfully TxHash: " + tx.hash,
        });
      } else {
        notifyError({
          title: "Error",
          message: "Not supported yet, please enter only one receipient address",
        });
      }
    } catch (error: any | ethers.BytesLike) {
      console.log(error);
      if (error.data)
        console.log(tokenTreatContract.interface.parseError(ethers.getBytes(error.data)));
      notifyError({ title: "Error", message: "Error creating treat, please try again later" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {}, [notifyError, notifySuccess]);

  return (
    <Flex w={"100%"} display={"flex"} justifyContent={"space-around"} flexWrap={"wrap"} gap={5}>
      <LoadingScreen isLoading={isLoading} />

      {imagePromtUrl && (
        <Box boxSize="sm">
          <Image src={imagePromtUrl} alt="Selected Image" boxSize="100%" objectFit="cover" />
          Powered By Corcel AI
        </Box>
      )}

      <VStack w={"45%"} minWidth={"270px"} gap={2}>
        <Text textAlign="left" fontWeight="bold">
          Treat Name
        </Text>
        <Input
          value={treatName}
          onChange={(e) => setTreatName(e.target.value)}
          type="textarea"
          placeholder="Enter Treat Name"
        />
      </VStack>

      <VStack w={"45%"} minWidth={"270px"} gap={2} textAlign="left">
        <Text textAlign="left" fontWeight="bold">
          Treat Type
        </Text>
        <Select
          value={treatType}
          onChange={(e) => {
            setTreatType(e.target.value);
          }}
        >
          <option value="None">Select an option</option>
          <option value="discount">Discount Coupon</option>
          <option value="giveaway">Giveaway</option>
          <option value="gift">Gift</option>
          <option value="prize">Prize</option>
        </Select>
      </VStack>

      <VStack w={"45%"} minWidth={"270px"} gap={2} textAlign="left">
        <Text textAlign="left" fontWeight="bold">
          Treat Value
        </Text>
        <Input
          value={treatValue}
          onChange={(e) => setTreatValue(e.target.value)}
          type="textarea"
          placeholder="Treat Value"
        />
      </VStack>

      <VStack w={"45%"} minWidth={"270px"} gap={2} textAlign="left">
        <Text textAlign="left" fontWeight="bold">
          Token Address for Treat
        </Text>
        <Flex>
          <TokenSelectDropdown
            token={selectTreatToken}
            setToken={setSelectTreatToken}
            options={selectTokenList}
          />
          <Input
            value={treatToken}
            onChange={(e) => setTreatToken(e.target.value)}
            type="textarea"
          />
        </Flex>
      </VStack>

      <VStack w={"45%"} minWidth={"270px"} gap={2} textAlign="left">
        <Text textAlign="left" fontWeight="bold">
          Burn On Claim
        </Text>
        <Select
          value={burnOnClaims}
          onChange={(e) => {
            setburnOnClaim(e.target.value);
          }}
        >
          <option value="None">Select an option</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </Select>
      </VStack>

      <VStack w={"45%"} minWidth={"270px"} gap={2} textAlign="left">
        <Text textAlign="left" fontWeight="bold">
          Is Transferable
        </Text>
        <Select
          value={transferable}
          onChange={(e) => {
            setTransferable(e.target.value);
          }}
        >
          <option value="None">Select an option</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </Select>
      </VStack>

      <VStack w={"45%"} minWidth={"270px"} gap={2} textAlign="left">
        <Text textAlign="left" fontWeight="bold">
          Treat Description
        </Text>
        <Input
          value={treatDescription}
          onChange={(e) => setTreatDescription(e.target.value)}
          type="textarea"
          placeholder="Treat Description"
        />
      </VStack>

      <VStack w={"45%"} minWidth={"270px"} gap={2} textAlign="left">
        <Text textAlign="left" fontWeight="bold">
          NFT Image Promt
        </Text>
        <Input
          value={imagePromt}
          onChange={(e) => setImagePromt(e.target.value)}
          type="textarea"
          placeholder="Enter Image Promt for NFT"
        />
      </VStack>

      {/* <VStack w={"45%"} minWidth={"270px"} gap={2} textAlign="left">
        <Text textAlign="left" fontWeight="bold">Treat Image</Text>
        <Input
          onChange={(e) => setTreatImage(e?.target?.files)}
          type="file"
        />
      </VStack> */}

      <VStack w={"45%"} minWidth={"270px"} gap={2} textAlign="left">
        <Text textAlign="left" fontWeight="bold">
          Treat Validity
        </Text>
        <Input
          value={treatValidity}
          onChange={(e) => {
            setTreatValidity(e.target.value);
          }}
          type="datetime-local"
        />
      </VStack>

      <VStack w={"45%"} minWidth={"270px"} gap={2} textAlign="left">
        <Text textAlign="left" fontWeight="bold">
          Refund Treasury Address
        </Text>
        <Input
          value={refundTreasury}
          onChange={(e) => setRefundTreasury(e.target.value)}
          type="text"
          placeholder="Address where unclaimed funds will be sent"
        />
      </VStack>

      <VStack w={"100%"} minWidth={"270px"} gap={2} textAlign="left">
        <Text textAlign="left" fontWeight="bold">
          Receipinets
        </Text>
        <Input
          value={receipients}
          onChange={(e) => setReceipients(e.target.value)}
          type="text"
          placeholder="Address of receipient of this nft, separate address using comma (,)"
        />
      </VStack>
      <VStack w={"100%"} minWidth={"270px"} gap={2} textAlign="left">
        {platformFee && totalChargeableAmount && tokenSymbol && (
          <Box p={4} borderWidth={1} borderRadius="lg" borderColor="teal.500" bg="gray.50">
            <Text fontWeight="bold" fontSize="lg" color="teal.700">
              Invoice:
            </Text>
            <Text fontWeight="bold" color="teal.600">
              Treat Amount:{" "}
              <Text as="span" color="black">
                {treatValue} {tokenSymbol}
              </Text>
            </Text>
            <Text fontWeight="bold" color="teal.600">
              Platform Fee:{" "}
              <Text as="span" color="black">
                {platformFee} {tokenSymbol}
              </Text>
            </Text>
            <Text fontWeight="bold" color="teal.600">
              Total Chargeable Amount:{" "}
              <Text as="span" color="black">
                {totalChargeableAmount} {tokenSymbol}
              </Text>
            </Text>
          </Box>
        )}
      </VStack>

      <VStack w={"45%"} minWidth={"270px"} gap={2} textAlign="left">
        <Button
          colorScheme="teal"
          variant="solid"
          onClick={() => {
            createTreat();
          }}
          isLoading={isLoading}
          className="custom-button"
        >
          Create a Treat
        </Button>
      </VStack>
    </Flex>
  );
};

export default CreateTokenTreat;
