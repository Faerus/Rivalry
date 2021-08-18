pragma solidity 0.5.16;

import "./TokenBank.sol";

contract Betting is TokenBank {

  /* TODO: 
    - events PoolCreation/Deletion, Bet/Unbet ?
    - devil advocate
    - winners vs losers
  */

  struct Pool {
    address token;
    string name;
    uint256 totalPositiveAmount;
    mapping(address => uint256) positiveAmounts;
    uint256 totalNegativeAmount;
    mapping(address => uint256) negativeAmounts;
  }
  
  uint public _poolCount = 0;
  uint private _poolCreationPrice = 1000 * 10**18;
  mapping(uint => address) public _poolsIndexes;
  mapping(address => Pool) public _pools;

  constructor(address tokenAddress, address bankWalletAddress) TokenBank(tokenAddress, bankWalletAddress) public {
    require(tokenAddress != address(0), "Token address not set");
    require(bankWalletAddress != address(0), "Bank wallet address not set");
  }

  function setPoolCreationPrice(uint256 price) public onlyOwner {
    _poolCreationPrice = price;
  }

  function createPool(address token, string memory name, uint256 positiveAmount, uint256 negativeAmount) public {
    require(positiveAmount + negativeAmount  >= _poolCreationPrice, "Not enough token to create pool");
    require(_pools[token].token != token, "Pool is already existing");

    // Only increment pool counter
    _poolsIndexes[_poolCount] = token;
    _poolCount++;

    // Create pool
    Pool storage pool = _pools[token];
    pool.name = name;

    // Initiate first bet
    bet(token, positiveAmount, negativeAmount);
  }

  function bet(address token, uint256 positiveAmount, uint256 negativeAmount) public {
    Pool storage pool = _pools[token];
    //require(pool.token == token, "Pool does not exist for this token");
    //require(tokenBalanceOf(msg.sender) >= positiveAmount + negativeAmount, "Sender balance is less than sum of specified amounts");

    transferToBankWallet(positiveAmount + negativeAmount);

    pool.positiveAmounts[msg.sender] += positiveAmount;
    pool.totalPositiveAmount += positiveAmount;

    pool.negativeAmounts[msg.sender] += negativeAmount;
    pool.totalNegativeAmount += negativeAmount;
  }

  function unbet(address token, uint256 positiveAmount, uint256 negativeAmount) public {
    Pool storage pool = _pools[token];
    require(pool.token == token, "Pool does not exist for this token");
    require(pool.positiveAmounts[msg.sender] >= positiveAmount, "User has not bet that much amount on positive");
    require(pool.negativeAmounts[msg.sender] >= negativeAmount, "User has not bet that much amount on negative");
    //require(tokenBalanceOfBank() >= positiveAmount + negativeAmount, "Bank balance is less than sum of specified amounts");

    if(positiveAmount > 0) {
      transferFromBankWallet(positiveAmount);
      pool.positiveAmounts[msg.sender] -= positiveAmount;
      pool.totalPositiveAmount -= positiveAmount;
    }

    if(negativeAmount > 0) {
      transferFromBankWallet(negativeAmount);
      pool.negativeAmounts[msg.sender] -= negativeAmount;
      pool.totalNegativeAmount -= negativeAmount;
    }
  }
}
