pragma solidity >=0.5.0 <0.8.0;

import "./Ownable.sol";
import "./Token.sol";

contract TokenBank is Ownable {
  uint256 constant private MAX_UINT256 = 2**256 - 1;

  address private _bankWalletAddress;
  address private _tokenAddress;
  IToken private _tokenContract;

  constructor(address tokenAddress, address bankWalletAddress) public {
    setTokenAddress(tokenAddress);
    setBankWalletAddress(bankWalletAddress);
  }

  function setTokenAddress(address tokenAddress) public onlyOwner {
    _tokenAddress = tokenAddress;
    _tokenContract = IToken(tokenAddress);
  }

  function setBankWalletAddress(address bankWalletAddress) public onlyOwner {
    _bankWalletAddress = bankWalletAddress;
  }

  function tokenBalanceOf(address account) public view returns (uint256) {
    return _tokenContract.balanceOf(account);
  }

  function tokenBalanceOfBank() public view returns (uint256) {
    return _tokenContract.balanceOf(_bankWalletAddress);
  }

  function transferFromBankWallet(uint256 amount) internal {
    require(_tokenContract.balanceOf(_bankWalletAddress) >= amount, "Bank balance is too low");
    _tokenContract.transferFrom(_bankWalletAddress, tx.origin, amount);
  }

  function transferToBankWallet(uint256 amount) public {
    address recipient = tx.origin;
    require(_tokenContract.balanceOf(recipient) >= amount, "Sender balance is too low");
    _tokenContract.transferFrom(recipient, _bankWalletAddress, amount);
  }
}