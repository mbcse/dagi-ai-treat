"use client";
import { useEffect, useState } from "react";

import { Box, Flex, Text, SimpleGrid } from "@chakra-ui/react";
import { ethers } from "ethers";
import { useAccount, useChainId } from "wagmi";

import { Footer, Header } from "@/components";
import LoadingScreen from "@/components/MainPane/components/LoadingScreen";
import { NftCard } from "@/components/NftCard";
import { SideBar } from "@/components/Sidebar";
import { ERC20ABI, TOKEN_TREAT_ABI, TOKEN_TREAT_CONTRACT_ADDRESS } from "@/config";
import { getDefaultEthersSigner } from "@/utils/clientToEtherjsSigner";
import { convertToUnixTimestamp, formatUnixTimestamp } from "@/utils/timeUtils";

export default function MyTreats() {
  const account = useAccount();
  const chainId = useChainId();
  const tokenTreatContractAddress = TOKEN_TREAT_CONTRACT_ADDRESS[chainId];

  const [myTreats, setMyTreats] = useState<any>([]);
  const [isLoading, setIsLoading] = useState(false);

  const TREAT_STATUS: { [key: string]: any } = {
    "1": "ACTIVE",
    "2": "CLAIMED",
    "3": "EXPIRED",
  };

  const getTokenData = async (treatToken: string) => {
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

  useEffect(() => {
    const fetchTreats = async () => {
      console.log(account.isConnecting);

      if (account.isConnecting) return;
      setIsLoading(true);
      console.log("Fetching Treats");
      const signer = await getDefaultEthersSigner();
      const tokenTreatContract = new ethers.Contract(
        tokenTreatContractAddress,
        TOKEN_TREAT_ABI,
        signer,
      );
      const treats = [];
      const myTreats = await tokenTreatContract.getAllTreatsOfOwner(account.address);
      console.log(myTreats);
      for (let i = 0; i < myTreats.length; i++) {
        const treat = await tokenTreatContract.getTreatInfo(myTreats[i]);
        const { tokenDecimals, tokenSymbol } = await getTokenData(treat.treatData.tokenAddress);
        const treatMetadataRes = await fetch(
          treat.tokenUri.replace("ipfs://", "https://gateway.lighthouse.storage/ipfs/"),
        );
        console.log("Treat Metadata Response:", treatMetadataRes);
        const treatMetadata = await treatMetadataRes.json();
        console.log("Treat Metadata:", treatMetadata);

        let treatStatus = TREAT_STATUS[treat.treatData.status.toString()];
        if (treatStatus === "ACTIVE") {
          console.log(Number(treat.treatData.expiry));
          console.log(convertToUnixTimestamp(Date.now()));
          if (Number(treat.treatData.expiry) < convertToUnixTimestamp(Date.now())) {
            console.log("expired");
            treatStatus = "EXPIRED";
          }
        }

        const treatObject = {
          nftId: myTreats[i],
          treatAmount: ethers.formatUnits(treat.treatData.amount.toString(), tokenDecimals),
          treatCurrencySymbol: tokenSymbol,
          treatExpiry: formatUnixTimestamp(Number(treat.treatData.expiry.toString())),
          treatStatus,
          treatDescription: treat.treatData.treatMetadata,
          transferable: treat.treatData.transferable,
          treatMetadata,
        };

        console.log("Treat Object:", treatObject);
        treats.push(treatObject);
      }
      setMyTreats(treats);
      setIsLoading(false);
    };
    fetchTreats();
  }, [account.address]);

  return (
    <Flex flexDirection="column" minHeight="100vh" bg="gray.50">
      <LoadingScreen isLoading={isLoading} />
      <Header />
      <Text align="center" fontSize="4xl" my={6} color="purple.700">
        My Claimable Treats
      </Text>
      <Flex>
        <SideBar />
        <Box as="main" flex={1} p={6} ml="250px">
          <SimpleGrid columns={{ sm: 1, md: 2, lg: 3 }} spacing={8}>
            {myTreats.map((treat: any) => (
              <NftCard
                key={treat.nftId}
                title={treat.treatMetadata.name + "#" + treat.nftId}
                imageUrl={treat.treatMetadata.image.replace(
                  "ipfs://",
                  "https://gateway.lighthouse.storage/ipfs/",
                )}
                description={treat.treatMetadata.description}
                amount={`${treat.treatAmount} ${treat.treatCurrencySymbol}`}
                status={treat.treatStatus}
                expiry={treat.treatExpiry}
                nftId={treat.nftId}
                setIsLoading={setIsLoading}
              />
            ))}
          </SimpleGrid>
        </Box>
      </Flex>
      <Footer />
    </Flex>
  );
}
