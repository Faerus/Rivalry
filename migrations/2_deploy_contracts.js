var StandardToken = artifacts.require("./StandardToken.sol");
var Betting = artifacts.require("./Betting.sol");

const tokenSettings = {
  tokenContractAddress: "0x155040625d7ae3e9cada9a73e3e44f76d3ed1409",
  bankWalletAddress: "0x08e0837f42f0e3ac940e69132a684297f689735b",
  tokenSupply: 1000000,
  tokenName: "Micha Cool",
  tokenDecimals: 18,
  tokenSymbol: "MCA",
};

const bettingSettings = {
  bankWalletAddress: "0xe159101165F4088d252a517887c0466f91fC3Afc",
};

module.exports = function (deployer) {
    deployer.then(async () => {
      await deployer.deploy(StandardToken, tokenSettings.tokenSupply, tokenSettings.tokenName, tokenSettings.tokenDecimals, tokenSettings.tokenSymbol);
      await deployer.deploy(Betting, StandardToken.address, bettingSettings.bankWalletAddress);

      // console.log("Approving Betting to spend bank (=owner) tokens...");
      // const token = await StandardToken.deployed();
      // const approved = await token.approve(Betting.address, 2**256 - 1);
      // console.log(approved ? "Approved" : "Not approved");
  });
};
