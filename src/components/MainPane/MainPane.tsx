// components/MainPane.tsx
import { type FC } from "react";

import { Box, Divider, Flex, Heading, Text, useColorMode } from "@chakra-ui/react";
import { useAccount } from "wagmi";

import styles from "@/styles/mainPane.module.css";

import {
  Status,
  Address,
  Chain,
  Balance,
  BlockNumber,
  TransferNative,
  SignMessage,
} from "./components";
import CreateTokenTreat from "./components/CreateTokenTreat";

const MainPane: FC = () => {
  const { isConnected } = useAccount();
  const { colorMode } = useColorMode();

  return (
    <Box
      className={styles.container}
      border={colorMode === "light" ? "none" : "1px solid rgba(152, 161, 192, 0.24)"}
    >
      <Heading as="h2" fontSize={"2rem"} mb={1} className="text-shadow">
        Create a TokenTreat
      </Heading>

      <Heading as="h6" fontSize={"1rem"} mb={10} className="text-shadow">
        <Text color="orange.500">Ephemeral/Consumable nfts on Blockchain!</Text>
      </Heading>

      <Flex className={styles.content}>
        {/* <Status /> */}

        {isConnected ? (
          <>
            <Address />

            <Divider mb={5} />

            <Flex
              w={"100%"}
              display={"flex"}
              justifyContent={"space-around"}
              flexWrap={"wrap"}
              gap={5}
            >
              {/* <SignMessage />
              <TransferNative /> */}

              <CreateTokenTreat />
            </Flex>
          </>
        ) : (
          <Text>Connect to a wallet to create a TokenTreat</Text>
        )}
      </Flex>
    </Box>
  );
};

export default MainPane;
