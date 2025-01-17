const { artifacts, ethers, upgrades } = require("hardhat");
const getNamedSigners = require("../utils/getNamedSigners");
const saveToConfig = require("../utils/saveToConfig");
const readFromConfig = require("../utils/readFromConfig");
const deploySettings = require("./deploySettings");
const deployContract = require("../utils/deployContract");
const { getChain } = require("../utils/chainsHelper");
const deployUpgradableContract = require("../utils/deployUpgradableContract");
const verifyUpgradableContract = require("../utils/verifyUpgradableContract");

const getDeployHelpers = async () => {
  const chainId = await hre.getChainId();
  const CHAIN_NAME = getChain(chainId).name;
  const { payDeployer } = await getNamedSigners();
  return { chainId, CHAIN_NAME, payDeployer };
};

async function main() {
  const deployHelpers = await getDeployHelpers();
  const owner = deploySettings["COMMON"].OWNER_ADDRESS;
  const deployedAddress = await deployUpgradableContract(
    hre,
    deployHelpers.chainId,
    "TokenTreat",
    deployHelpers.payDeployer,
    [owner, owner],
  );

  await verifyUpgradableContract(
    hre,
    "contracts/TokenTreat.sol:TokenTreat",
    deployedAddress,
    "84532",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
