import Navbar from "../components/Navbar.js";
import "../styles/App.css";
import { MASTERCHEFCONTRACT, LPCONTRACT } from "../blockchain/config";
import Web3 from "web3";
import React from "react";
import GetFarms from "./apr";
import FARMABI from '../blockchain/ABIs/FARMABI.json';
import LPABI from '../blockchain/ABIs/LPABI.json';
import { totalDeposit, pendingRewards } from "../functions/farm/farmFunctions.js";

export let refreshData;
export let farmcontract;
export let lpcontract;
export let account = null;

export default function Farm() {
  
  async function FarmConnectWallet() {
    if (window.ethereum) {
      var web3 = await new Web3(window.ethereum);
      await window.ethereum.send("eth_requestAccounts");
      var accounts = await web3.eth.getAccounts();
      account = accounts[0];
      let accountText = `${accounts[0].slice(0, 4)}***${accounts[0].slice(
        38,
        42
      )}`;
      document.querySelector("#connectbtn").value = accountText;
      farmcontract = new web3.eth.Contract(FARMABI, MASTERCHEFCONTRACT);
      lpcontract = new web3.eth.Contract(LPABI, LPCONTRACT);

      totalDeposit();
      pendingRewards();
      refreshData = await window.setInterval(() => {
        pendingRewards();
        totalDeposit();
      }, 5000);

    } else {
      alert("Please install metamask");
    }
  }

  return (
    <div>
      <div className="nftapp" style={{ height: "100%", textAlign: "center" }}>
        <Navbar 
        connectwallet={FarmConnectWallet}
        />
        <GetFarms
        />
      </div>
    </div>
  );
}
