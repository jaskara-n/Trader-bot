// MockToken.sol
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

// DeployMock.s.sol
pragma solidity ^0.8.20;

import "forge-std/Script.sol";

contract DeployMockERC20 is Script {
    function run() external {
        vm.startBroadcast();

        MockToken token = new MockToken("Mock UNI", "UNI");
        token.mint(msg.sender, 10000000 ether);
        vm.stopBroadcast();

        console.log("Token deployed at:", address(token));
    }
}

//  forge script script/DeployMock.s.sol --rpc-url $RPC_URL --broadcast
