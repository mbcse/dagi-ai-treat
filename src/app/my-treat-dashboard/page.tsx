"use client";
import { Box, Flex } from "@chakra-ui/react";

import { Footer, Header } from "@/components";
import { SideBar } from "@/components/Sidebar";

export default function Dashboard() {
  return (
    <Flex flexDirection="column" minHeight="100vh">
      <Header />

      <Box as="main" flex={1} p={4}>
        <SideBar></SideBar>
      </Box>

      <Footer />
    </Flex>
  );
}
