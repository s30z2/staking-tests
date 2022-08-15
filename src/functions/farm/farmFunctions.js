import { farmcontract, lpcontract, account} from '../../farm/Farm';
import Web3 from "web3";
import { MASTERCHEFCONTRACT, infinite } from "../../blockchain/config";

export default async function enable() {
    await lpcontract.methods.approve(MASTERCHEFCONTRACT, infinite).send({ from: account });
  }

export async function max() {
    var balanceCall = await lpcontract.methods.balanceOf(account).call();
    var result = Web3.utils.fromWei(balanceCall, "ether");
    document.querySelector("#amount").value = result;
  }

export async function deposit(e) {
    const value = document.querySelector("#amount").value;
    const amount = Web3.utils.toWei(value, "ether");
    await farmcontract.methods.deposit(0, amount).send({ from: account });

    const totalStaked = await farmcontract.methods.userInfo(0, account).call(); //m
    var deposit = Web3.utils.fromWei(totalStaked.amount);
    var totalBalance = Number(deposit);
    document.getElementById('stakedBalance').textContent = totalBalance;
  }
export async function withdraw(e) {
    const value = document.querySelector("#unstk-amount").value;
    const amount = Web3.utils.toWei(value, "ether");
    await farmcontract.methods.withdraw(0, amount).send({ from: account }); //m

    const totalStaked = await farmcontract.methods.userInfo(0, account).call(); //m
    var deposit = Web3.utils.fromWei(totalStaked.amount);
    var totalBalance = Number(deposit);
    // getTvl();
    // getApr();
    document.getElementById('stakedBalance').textContent = totalBalance;
  }
export async function totalDeposit(e) {
    const totalStaked = await farmcontract.methods.userInfo(0, account).call(); //m
    var deposit = Web3.utils.fromWei(totalStaked.amount);
    var totalBalance = Number(deposit);
    document.getElementById('stakedBalance').textContent = totalBalance;
  }
export async function totalStaked(e) {
    const totalStaked = await farmcontract.methods.userInfo(0, account).call(); //m
    var deposit = Web3.utils.fromWei(totalStaked.amount);
    document.querySelector("#unstk-amount").value = deposit;
  }
export async function pendingRewards(e) {
    const pendingRewards = await farmcontract.methods.pendingSushi(0, account).call(); //m
    const rawRewards = Web3.utils.fromWei(pendingRewards);
    const rewards = Number(rawRewards).toFixed(2);
    document.getElementById('rewards').textContent = rewards;
  }
export async function harvest(e) {
    await farmcontract.methods.withdraw(0, 0).send({ from: account }); //m
    document.getElementById('rewards').textContent = 0;
  }