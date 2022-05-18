const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Weak Randomness", function () {    
  let deployer, attacker, user;
  beforeEach(async function (){
    [deployer, attacker, user] = await ethers.getSigners();   
    const Lottery = await ethers.getContractFactory("Lottery", deployer);
    this.lottery = await Lottery.deploy();

    const LotteryAttacker = await ethers.getContractFactory("LotteryAttack", attacker);
    this.lotteryAttacker = await LotteryAttacker.deploy(this.lottery.address);
  });

  describe("Lottery", function() {
    
    describe.skip("With bets open", function() {
      it("Should allow a user to place a bet", async function () {
        await this.lottery.placeBet(5, {value: ethers.utils.parseEther("10")});
        expect (await this.lottery.bets(deployer.address)).to.eq(5);
      });

      it("Should revert if user bet more than 1 time", async function () {
        await this.lottery.placeBet(5, {value: ethers.utils.parseEther("10")});
        await expect (this.lottery.placeBet(100, {value: ethers.utils.parseEther("10")})).to.be.revertedWith("Only 1 bet number per player"); 
      });

      it("Should revert if bet value is less than 10 ether", async function () {
        await expect (this.lottery.placeBet(111, {value: ethers.utils.parseEther("7")})).to.be.revertedWith("Bet cost = 10 ether"); 
        await expect (this.lottery.placeBet(112, {value: ethers.utils.parseEther("17")})).to.be.revertedWith("Bet cost = 10 ether"); 
      });

      it("Should revert if bet number < 0", async function () {
        await expect (this.lottery.placeBet(0, {value: ethers.utils.parseEther("10")})).to.be.revertedWith("Must be a number from 1 to 254"); 
      });      
    });  
    
    describe.skip("With bets closed", function() {
      it("Should revert if a user place a bet", async function () {
      await this.lottery.endLottery();
      await expect (this.lottery.placeBet(100, {value: ethers.utils.parseEther("10")})).to.be.revertedWith("Bets are closed"); 
      });

      it("Should allow only the winner to withdraw the price", async function () {      
        await this.lottery.connect(user).placeBet(5, {value: ethers.utils.parseEther("10")});
        await this.lottery.connect(attacker).placeBet(10, {value: ethers.utils.parseEther("10")});

        await this.lottery.placeBet(15, {value: ethers.utils.parseEther("10")});

        let winningNumber = 0;
        while(winningNumber != 10) {
          await this.lottery.endLottery(); 
          winningNumber = await this.lottery.winningNumber();
          console.log("The winning number = ", winningNumber);          
        }  
        console.log("Block = ", await ethers.provider.getBlock("latest"));    
        const initAttackerBalance =  await ethers.provider.getBalance(attacker.address);
        const initUserBalance =  await ethers.provider.getBalance(user.address);
        console.log("initAttackerBalance = ", ethers.utils.formatEther(initAttackerBalance));
        console.log("initUserBalance = ", ethers.utils.formatEther(initUserBalance));
        await expect(this.lottery.connect(attacker).withdrawPrize()).to.be.revertedWith("You are not winner");
        await this.lottery.connect(user).withdrawPrize();
        const afterWinningAttackerBalance =  await ethers.provider.getBalance(attacker.address);
        const afterWinningUserBalance =  await ethers.provider.getBalance(user.address);
        console.log("afterWinningAttackerBalance = ", ethers.utils.formatEther(afterWinningAttackerBalance));
        console.log("afterWinningUserBalance = ", ethers.utils.formatEther(afterWinningUserBalance));

      });
      
    });   

    describe.skip("Attack by guess the number", function() {
      it("A miner could guess the number", async function () {
        await this.lottery.connect(user).placeBet(5, {value: ethers.utils.parseEther("10")});
        await this.lottery.connect(attacker).placeBet(10, {value: ethers.utils.parseEther("10")});
        await this.lottery.placeBet(15, {value: ethers.utils.parseEther("10")});
  
        await ethers.provider.send("evm_setNextBlockTimestamp",[1652854163]);
        
        let winningNumber = 0;
        while(winningNumber != 10) {
            await this.lottery.endLottery(); 
            winningNumber = await this.lottery.winningNumber();
            console.log("The winning number = ", winningNumber);
        }      
          const initAttackerBalance =  await ethers.provider.getBalance(attacker.address);       
          console.log("initAttackerBalance = ", ethers.utils.formatEther(initAttackerBalance));        
          await this.lottery.connect(attacker).withdrawPrize();      
          const afterWinningAttackerBalance =  await ethers.provider.getBalance(attacker.address);     
          console.log("afterWinningAttackerBalance = ", ethers.utils.formatEther(afterWinningAttackerBalance));
        });  
        
    });  
    
    describe("Attack by contract interactive", function() {
      it("Attack by call inteface from Attack Contract", async function() {        
        await this.lotteryAttacker.attack({value: ethers.utils.parseEther("10")});            
        await this.lottery.endLottery();    
        await ethers.provider.send("evm_mine");//mint block manually so we could excute 2 trans in one next block
        console.log("attacker number: " + (await this.lottery.bets(this.lotteryAttacker.address)));
        console.log("winning number:  "+ (await this.lottery.winningNumber()));
      });
    });

  });    

   
});
