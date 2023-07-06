import { useRef, useState } from "react";

import {
  Box,
  Image,
  Text,
  VStack,
  Flex,
  Button,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Input,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { ethers } from "ethers";
import { useAccount, useChainId } from "wagmi";

import { TOKEN_TREAT_ABI, TOKEN_TREAT_CONTRACT_ADDRESS } from "@/config";
import { useNotify } from "@/hooks";
import { getDefaultEthersSigner } from "@/utils/clientToEtherjsSigner";

import LoadingScreen from "../MainPane/components/LoadingScreen";

const rotate = keyframes`
  0% { transform: rotateY(0deg); }
  50% { transform: rotateY(180deg); }
  100% { transform: rotateY(0deg); }
`;

const NftCard: React.FC<{
  title: string;
  imageUrl: string;
  description: string;
  amount: string;
  status: string;
  expiry: string;
  nftId: string;
  setIsLoading: any;
}> = ({ title, imageUrl, description, amount, status, expiry, nftId, setIsLoading }) => {
  const { notifyError, notifySuccess } = useNotify();
  console.log(nftId);
  const account = useAccount();
  const chainId = useChainId();
  const tokenTreatContractAddress = TOKEN_TREAT_CONTRACT_ADDRESS[chainId];

  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<any>();
  const [claimAddress, setClaimAddress] = useState<string>("");

  const claim = async () => {
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
      const claimTx = await tokenTreatContract.claimTreat(nftId);
      console.log(claimTx);
      await claimTx.wait();
      notifySuccess({
        title: "Claimed",
        message: "You have successfully claimed the Amount, TxHash: " + claimTx.hash,
      });
    } catch (error) {
      console.log(error);
      notifyError({ title: "Error", message: "Failed to claim the Amount" });
    } finally {
      setIsLoading(false);
    }
  };

  const claimAtAddress = async (claimAddress: string) => {
    try {
      setIsLoading(true);
      const signer = await getDefaultEthersSigner();
      const tokenTreatContract = new ethers.Contract(
        tokenTreatContractAddress,
        TOKEN_TREAT_ABI,
        signer,
      );
      const claimTx = await tokenTreatContract.claimTreatAtAddress(nftId, claimAddress);
      console.log(claimTx);
      await claimTx.wait();
      notifySuccess({
        title: "Claimed",
        message: "You have successfully claimed the Amount, TxHash: " + claimTx.hash,
      });
    } catch (error) {
      console.log(error);
      notifyError({ title: "Error", message: "Failed to claim the Amount" });
    } finally {
      setIsLoading(false);
    }
  };

  const burn = async () => {
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

  const handleClaim = async () => {
    if (claimAddress) {
      await claimAtAddress(claimAddress);
    } else {
      await claim();
    }
    onClose();
  };

  return (
    <>
      <Box
        bg="white"
        maxW="sm"
        borderWidth="1px"
        borderRadius="lg"
        overflow="hidden"
        boxShadow="xl"
        transition="transform 0.3s"
        _hover={{
          transform: "scale(1.05) rotateY(0deg)",
          boxShadow: "2xl",
          animationPlayState: "paused",
        }}
        animation={`${rotate} `}
        transformStyle="preserve-3d"
        mb={8}
      >
        <Image
          src={imageUrl}
          alt={title}
          borderRadius="lg"
          objectFit={"cover"}
          w="100%"
          height="200px"
        />
        <VStack p="6" spacing="4" align="start">
          <Text fontWeight="bold" fontSize="2xl" color="purple.600">
            {title}
          </Text>
          <Text>{description}</Text>
          <Text fontWeight="bold" color="purple.500">
            {amount}
          </Text>
          <Flex justify="space-between" w="100%">
            {status === "CLAIMED" || status === "EXPIRED" ? (
              <Text color={status === "CLAIMED" ? "green.500" : "red.500"}>{status}</Text>
            ) : status === "ACTIVE" ? (
              <Button colorScheme="teal" onClick={onOpen}>
                CLAIM
              </Button>
            ) : (
              <Button colorScheme="red" onClick={burn}>
                BURN
              </Button>
            )}
          </Flex>
          <Text>Expiry: {expiry}</Text>
        </VStack>
      </Box>

      <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Claim Treat
            </AlertDialogHeader>

            <AlertDialogBody>
              Do you want to claim at a different address?
              <Input
                placeholder="Enter address (optional)"
                value={claimAddress}
                onChange={(e) => setClaimAddress(e.target.value)}
                mt={4}
              />
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="teal" onClick={handleClaim} ml={3}>
                Claim
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};

export default NftCard;
