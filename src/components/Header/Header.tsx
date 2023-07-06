"use client";
import { type FC } from "react";

import { Button, HStack, Heading } from "@chakra-ui/react";
import { Avatar } from "@coinbase/onchainkit/identity";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Red_Rose } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { useAccount } from "wagmi";

import { useWindowSize } from "@/hooks/useWindowSize";

import logo from "../../../public/img/logo_transparent.png";
import TokenTreat from "../../../public/img/TokenTreat.svg";
import { DarkModeButton } from "../DarkModeButton";

const Header: FC = () => {
  let { address } = useAccount();
  const { isTablet } = useWindowSize();

  if (!address) {
    address = "0x0000000000000000000000000000000000000000"; // 0 zero address
  }

  return (
    <HStack
      as="header"
      p={"1.5rem"}
      position="sticky"
      top={0}
      zIndex={10}
      justifyContent={"space-between"}
    >
      <HStack>
        <Image src={TokenTreat.src} alt="logo" width={45} height={45} />
        {!isTablet && (
          <Link href={"/"}>
            <Heading as="h1" fontSize={"1.5rem"} className="text-shadow">
              TokenTreat
            </Heading>
          </Link>
        )}
      </HStack>

      <HStack>
        <Button colorScheme="purple">
          <Link href="/my-treat-dashboard/treat-burn-marketplace"> Treat Burn Marketplace</Link>
        </Button>
        <Button colorScheme="green">
          <Link href="/my-treat-dashboard/my-treats"> Dashboard </Link>
        </Button>
        <ConnectButton />
        <Avatar address={address} />;
        <DarkModeButton />
      </HStack>
    </HStack>
  );
};

export default Header;
