"use client";
import { useEffect, useState } from "react";

import {
  Box,
  Flex,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableCaption,
  TableContainer,
  Button,
} from "@chakra-ui/react";
import { ethers } from "ethers";
import { useAccount, useChainId } from "wagmi";

import { Footer, Header } from "@/components";
import LoadingScreen from "@/components/MainPane/components/LoadingScreen";
import { SideBar } from "@/components/Sidebar";
import { ERC20ABI, TOKEN_TREAT_ABI, TOKEN_TREAT_CONTRACT_ADDRESS } from "@/config";
import { useNotify } from "@/hooks";
import { getDefaultEthersSigner } from "@/utils/clientToEtherjsSigner";
import { convertToUnixTimestamp, formatUnixTimestamp } from "@/utils/timeUtils";

export default function CreatedTreats() {
  const { notifyError, notifySuccess } = useNotify();

  const account = useAccount();
  const chainId = useChainId();
  const tokenTreatContractAddress = TOKEN_TREAT_CONTRACT_ADDRESS[chainId];

  const [myCreatedTreats, setMyCreatedTreats] = useState<any>([]);
  const [isLoading, setIsLoading] = useState(false);

  const TREAT_STATUS: { [key: string]: any } = {
    "1": "ACTIVE",
    "2": "CLAIMED",
    "3": "EXPIRED_AND_REFUNDED",
  };

  const burn = async (nftId: string) => {
    try {
      setIsLoading(true);
      const signer = await getDefaultEthersSigner();
      const tokenTreatContract = new ethers.Contract(
        tokenTreatContractAddress,
        TOKEN_TREAT_ABI,
        signer,
      );
      console.log("hello");
      console.log(nftId);
      const claimTx = await tokenTreatContract.burnTreat(nftId);
      console.log(claimTx);
      await claimTx.wait();
      notifySuccess({
        title: "Burned",
        message:
          "You have successfully Burned the Treat, Thanks for contributing, TxHash: " +
          claimTx.hash,
      });
    } catch (error) {
      console.log(error);
      notifyError({ title: "Error", message: "Failed to Burn the treat" });
    } finally {
      setIsLoading(false);
    }
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
      const myTreats = await tokenTreatContract.getIssuedTreats(account.address);
      console.log(myTreats);
      for (let i = 0; i < myTreats.length; i++) {
        const treat = await tokenTreatContract.getTreatInfo(myTreats[i]);
        console.log("hello1");
        const treatOwner = await tokenTreatContract.ownerOf(myTreats[i]);
        console.log("hello2");

        const { tokenDecimals, tokenSymbol } = await getTokenData(treat.treatData.tokenAddress);
        console.log("hello3");
        const treatMetadataRes = await fetch(
          treat.tokenUri.replace("ipfs://", "https://gateway.lighthouse.storage/ipfs/"),
        );
        console.log("Treat Metadata Response:", treatMetadataRes);
        const treatMetadata = await treatMetadataRes.json();
        console.log("Treat Metadata:", treatMetadata);

        let treatStatus = TREAT_STATUS[treat.treatData.status.toString()];
        if (treatStatus === "ACTIVE") {
          if (Number(treat.treatData.expiry) < convertToUnixTimestamp(Date.now())) {
            treatStatus = "BURN";
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
          treatOwner,
        };

        console.log("Treat Object:", treatObject);
        treats.push(treatObject);
        setIsLoading(false);
      }
      setMyCreatedTreats(treats);
    };

    fetchTreats();
  }, []);

  return (
    <Flex flexDirection="column" minHeight="100vh" bg="gray.50">
      <LoadingScreen isLoading={isLoading} />
      <Header />
      <Flex>
        <SideBar />
        <Box as="main" flex={1} p={6} ml="250px">
          <Text fontSize="4xl" mb={6} color="purple.700">
            My Created Treats
          </Text>
          <TableContainer>
            <Table variant="striped" colorScheme="purple">
              <TableCaption>My Created Treats List</TableCaption>
              <Thead>
                <Tr>
                  <Th>ID</Th>
                  <Th>Description</Th>
                  <Th>Amount</Th>
                  <Th>Issued To</Th>
                  <Th>Expiry</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {myCreatedTreats.map((treat: any) => (
                  <Tr key={treat.nftId}>
                    <Td>{"#" + treat.nftId}</Td>
                    <Td>{treat.treatDescription}</Td>
                    <Td>{treat.treatAmount + " " + treat.treatCurrencySymbol}</Td>
                    <Td>
                      {treat.treatOwner === "0x0000000000000000000000000000000000000000"
                        ? "Destroyed"
                        : treat.treatOwner}
                    </Td>
                    <Td>{treat.treatExpiry}</Td>
                    <Td>
                      {treat.treatStatus === "BURN" ? (
                        <Button colorScheme="red" onClick={() => burn(treat.nftId)}>
                          BURN
                        </Button>
                      ) : (
                        treat.treatStatus
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
      </Flex>
      <Footer />
    </Flex>
  );
}
