import Web3 from 'web3';
import { account } from '../functions/ConnectButton';
import PAIRABI from '../blockchain/ABIs/PAIRABI.json';
import FARMABI from '../blockchain/ABIs/FARMABI.json';
import { Token, WBCH, ChainId } from '@mistswapdex/sdk';
import { MASTERCHEFCONTRACT, RLAMBOADDRESS, LAMBOADDRESS } from '../blockchain/config';
import axios from 'axios'
import { Button } from "react-bootstrap";
import { useCallback, useEffect, useState } from 'react';
import { deposit, max, withdraw, totalStaked, harvest } from '../functions/farm/farmFunctions';
import enable from '../functions/farm/farmFunctions';

export var apr;
export var tvl;
export var hardcodedPairs;

export default function GetFarms() {

    useEffect(() => {
        getAllocPointAndSushi()
        getBalances()
    }, [  ])

  const [totalAllocPoint, setTotalAllocPoint] = useState('');
  const [reserves, setReserves] = useState('');
  const [pendingSushi, setPendingSushi] = useState('');
  const [token1, setToken1] = useState('');
  const [token0, setToken0] = useState('');
  const [sushiPerBlock, setSushiPerBlock] = useState('');
  const [totalSupply, setTotalSupply] = useState('');
  const [v2PairsBalances, setV2PairsBalances] = useState([]);
 
  var web3 = new Web3(window.ethereum);

  const MasterchefContract = new web3.eth.Contract(FARMABI, MASTERCHEFCONTRACT)

  const RLAM = new Token(ChainId.SMARTBCH, RLAMBOADDRESS, 18, 'RLAM', 'Reward Lambo');
  const LAMBO = new Token(ChainId.SMARTBCH, LAMBOADDRESS, 18, 'LAMBO', 'Lambo Token');

  hardcodedPairs = {
    "0xC6c4d0531313d5B95169F15F0441F96784835054": {
      farmId: 0,
      allocPoint: 10000,
      token0: RLAM,
      token1: LAMBO,
      dex: 'Tangoswap'
    },
    "0xE1B5bC09427710BC4d886eC49654944110B58134": {
      farmId: 2,
      allocPoint: 5000,
      token0: WBCH[ChainId.SMARTBCH],
      token1: new Token(ChainId.SMARTBCH, '0x0E36C351ff40183435C9Bd1D17bfb1F3548f1963', 18, 'LAMBO', 'wenlambo'),
      dex: 'Mistswap'
    },
    "0x27580618797a2CE02FDFBbee948388a50a823611": {
      farmId: 888,
      allocPoint: 0,
      token0: WBCH[ChainId.SMARTBCH],
      token1: new Token(ChainId.SMARTBCH, '0xBc2F884680c95A02cea099dA2F524b366d9028Ba', 18, 'bcUSDT', 'BlockNG-Peg USDT Token'),
    },
  }

  let farms = []
  
  for (const [pairAddress, pair] of Object.entries(hardcodedPairs)) {
    const V2PairContract = new web3.eth.Contract(PAIRABI, pairAddress);

    const f = {
      pair: pairAddress,
      symbol: `${hardcodedPairs[pairAddress].token0.symbol}-${hardcodedPairs[pairAddress].token1.symbol}`,
      pool: {
        reserves: 0,
        totalSupply: 0,
        token0: undefined,
        token1: undefined,
      },
      allocPoint: pair.allocPoint,
      balance: "1000000000000000000",
      chef: 0,
      id: pair.farmId,
      pendingSushi: undefined,
      pending: 0,
      owner: {
        id: MASTERCHEFCONTRACT,
        sushiPerBlock: "10000000000000000000",
        totalAllocPoint: "10000"
      },
      apr: '',
      userCount: 1,
      tvl: '',
      dex: pair.dex,
    }

    const variablesDeclaration = async () => {
      const totalSupply = await V2PairContract.methods.totalSupply().call();
      const reserves = await V2PairContract.methods.getReserves().call();
      const pendingSushi = await MasterchefContract.methods.pendingSushi(pair.farmId, account);
      const token1 = await V2PairContract.methods.token1().call();
      const token0 = await V2PairContract.methods.token0().call();  
      setTotalSupply(totalSupply);
      setReserves(reserves);
      setPendingSushi(pendingSushi);
      setToken1(token1);
      setToken0(token0);
    }
    variablesDeclaration()

    f.pool.totalSupply = totalSupply
    f.pool.reserves = reserves
    f.pendingSushi = pendingSushi
    f.pool.token1 = token1
    f.pool.token0 = token0
    f.pending = Number.parseFloat(f.pendingSushi).toFixed();

    farms.push(f);
  }

  let bchPriceUSD = 100;
  let lamboPriceBch = 0.0008;
  let rLamPriceUSD = 0.001; // precio en lambos
  let rLamPriceLambo = 0.001;
  const lamborlamPool = farms.find((v) => v.pair === '0xC6c4d0531313d5B95169F15F0441F96784835054').pool;
  const bchusdtPool = farms.find((v) => v.pair === '0x27580618797a2CE02FDFBbee948388a50a823611').pool;
  const lambobchPool = farms.find((v) => v.pair === '0xE1B5bC09427710BC4d886eC49654944110B58134').pool;

  if (bchusdtPool.reserves) {
    bchPriceUSD = Number.parseFloat(Number(bchusdtPool.reserves[1]).toFixed()) / Number.parseFloat(Number(bchusdtPool.reserves[0]).toFixed());
  }
  if (lambobchPool.reserves) {
    lamboPriceBch = Number.parseFloat(Number(lambobchPool.reserves[1]).toFixed()) / Number.parseFloat(Number(lambobchPool.reserves[0]).toFixed());
  }
  if (lamborlamPool.reserves && bchusdtPool.reserves && lambobchPool.reserves) {
    rLamPriceLambo = 1. / ( Number.parseFloat(Number(lamborlamPool.reserves[1]).toFixed()) / Number.parseFloat(Number(lamborlamPool.reserves[0]).toFixed()))
    rLamPriceLambo = rLamPriceLambo * lamboPriceBch; //precio en bch
    rLamPriceUSD = rLamPriceLambo * bchPriceUSD
  } 

  async function getBalances() {
    const v2PairsBalances = await Promise.all(farms.map(async (farm) => {
      const lpToken = new Token(ChainId.SMARTBCH, farm.pair, 18, 'LP', 'LP Token');
      const apicall = await axios.get(`https://sonar.cash/api?module=account&action=tokenbalance&contractaddress=${lpToken.address}&address=${MASTERCHEFCONTRACT}`)
      .then(output => {
        const { result } = output.data;
        const address  = lpToken.address;
        return [Web3.utils.fromWei(result, 'ether'), address]
      })
      return apicall;
    }))
    setV2PairsBalances(v2PairsBalances)
  }

  console.log('amor peronista');

  async function getAllocPointAndSushi() {
    const totalAllocPoint = await MasterchefContract.methods.totalAllocPoint().call();
    const sushiPerBlock = await MasterchefContract.methods.sushiPerBlock().call(); 
    setTotalAllocPoint(totalAllocPoint);
    setSushiPerBlock(sushiPerBlock);
  }

if(v2PairsBalances.length !== 0) {
  for (let i=0; i<farms.length; ++i) {
    if (v2PairsBalances?.[i][1] && farms[i].pool.totalSupply) {
      const totalSupply = farms[i].pool.totalSupply;
      const chefBalance = v2PairsBalances[i][0];

      if (farms[i].pool.token1 === RLAM.address) {
        const reserve = Number.parseFloat(farms[i].pool.reserves[1]).toFixed();
        tvl = reserve / totalSupply * chefBalance * rLamPriceUSD * 2;
      } 
      else if (farms[i].pool.token1 === RLAM.address) {
        const reserve = Number.parseFloat(farms[i].pool.reserves[1]).toFixed();
        tvl = reserve / totalSupply * chefBalance * rLamPriceUSD * 2;
      }
      else if (farms[i].pool.token0 === WBCH[ChainId.SMARTBCH].address) {
        const reserve = Number.parseFloat(farms[i].pool.reserves[0]).toFixed();
        tvl = reserve / totalSupply * chefBalance * bchPriceUSD * 2;
      }
      else if (farms[i].pool.token1 === WBCH[ChainId.SMARTBCH].address) {
        const reserve = Number.parseFloat(farms[i].pool.reserves[1]).toFixed();
        tvl = reserve / totalSupply * chefBalance * bchPriceUSD * 2;
      }
      farms[i].tvl = tvl;
      farms[i].totalSupply = totalSupply;
      farms[i].chefBalance = chefBalance;
    } else {
      farms[i].tvl = "0";
      farms[i].totalSupply = 0;
      farms[i].chefBalance = 0;
    }
  }
  
for (let i = 0; i < farms.length; i++) {
  const poolAllocPoint = farms[i].allocPoint
  const blocksPerDay = 15684; // calculated empirically
  const rewardPerBlock = (poolAllocPoint / totalAllocPoint) * Web3.utils.fromWei(sushiPerBlock) * 20;

  const defaultReward = {
    rewardPerBlock,
    rewardPerDay: rewardPerBlock * blocksPerDay,
    rewardPrice: +rLamPriceUSD,
  }

  const defaultRewards = [defaultReward]

  const roiPerBlock = defaultRewards.reduce((previousValue, currentValue) => {
    return previousValue + currentValue.rewardPerBlock * currentValue.rewardPrice
  }, 0) / farms[i].tvl;

  const roiPerDay = roiPerBlock * blocksPerDay;

  const roiPerYear = roiPerDay * 365;

  farms[i].apr = roiPerYear
  }
}
  return (
  <div>
   <div className="nftapp" style={{ height: "100%", textAlign: "center" }}>
    {farms.map((farm, key) => {
      if (farm.pair !== '0x27580618797a2CE02FDFBbee948388a50a823611') //bcusdt-wbch pair
      return (  
        <div>
          <div className="container" id="farm-container">
            <div className="col">
              <form
                style={{ margin: "auto", paddingBottom: "5px" }}
                className="nftminter"
              >
                <div className="row pt-3">
                  <div>
                    <h1 className="pt-2" style={{ fontWeight: "30" }}>
                      {farms[key].symbol} LP
                    </h1>
                    <h5 className="mb-4" style={{ fontWeight: "300" }}>
                      ({farm.dex})
                    </h5>
                  </div>
                </div>

                <div className="approvezone">
                  <h6 style={{ fontWeight: "40" }}>AUTHORIZE YOUR WALLET</h6>
                  <Button
                    className="btn authorize"
                    onClick={enable}
                    style={{
                      backgroundColor: "#ffffff10",
                      boxShadow: "1px 1px 5px #000000",
                      marginBottom: "20px",
                    }}
                  >
                    Approve
                  </Button>
                </div>
                <div className="tvl py-2">
                  <h5 style={{ fontWeight: "300" }}>TVL: <span id='tvl'>{farms[key].tvl}</span></h5>
                </div>
                    <div className="lp_input pb-2 pt-4">
                      <Button
                        style={{
                          marginRight: "10px",
                          marginBottom: "30px",
                          width: "20%",
                          height: "40px",
                          backgroundColor: "#ffffff10",
                          boxShadow: "1px 1px 5px #000000",
                        }}
                        onClick={deposit}
                        pool={farm.id}
                      >
                        Stake
                      </Button>
                      <input
                        id="amount"
                        style={{
                          width: "50%",
                          height: "40px",
                          padding: "15px",
                          borderRadius: "10px",
                          borderColor: "black",
                          color: "white",
                          backgroundColor: "#ffffff10",
                          boxShadow: "1px 1px 5px #00000",
                        }}
                        placeholder="Input the amount"
                      />
                      <Button
                        className="btn-sm"
                        pool={farm.id}
                        onClick={max}
                        style={{
                          marginBottom: "35px",
                          marginLeft: "10px",
                          backgroundColor: "#ffffff10",
                          boxShadow: "1px 1px 5px #000000",
                        }}
                      >
                        Max
                      </Button>
                    </div>
                    <div className="lp_input pb-3 text-center">
                      <Button
                        id='withdraw-button'
                        onClick={withdraw}
                        pool={farm.id}
                        style={{
                          marginRight: "10px",
                          marginBottom: "30px",
                          width: "20%",
                          height: "40px",
                          backgroundColor: "#ffffff10",
                          boxShadow: "1px 1px 5px #000000",
                          padding: '0px'
                        }}
                      >
                        Unstake
                      </Button>
                      <input
                        id="unstk-amount"
                        pool={farm.id}
                        style={{
                          width: "50%",
                          padding: "15px",
                          height: "40px",
                          borderRadius: "10px",
                          borderColor: "black",
                          color: "white",
                          backgroundColor: "#ffffff10",
                          boxShadow: "1px 1px 5px #00000",
                        }}
                        placeholder="Input the amount"
                      />
                      <Button
                        className="btn-sm"
                        onClick={totalStaked}
                        pool={farm.id}
                        style={{
                          marginBottom: "35px",
                          marginLeft: "10px",
                          backgroundColor: "#ffffff10",
                          boxShadow: "1px 1px 5px #000000",
                        }}
                      >
                        Max
                      </Button>
                    </div>
                <div
                  className="rewards farmgoldeffect"
                  style={{
                    borderStyle: "solid",
                    borderColor: "darkblue",
                    width: "90%",
                    margin: "auto",
                    borderRadius: "20px",
                    marginBottom: "50px",
                    borderWidth: "1px",
                  }}
                >
                  <h4 className="pt-3" style={{ fontWeight: "300" }}>
                    APR
                  </h4>
                  <h5 id='apr'>{farms[key].apr}%</h5>
                  <h4 className="pt-3" style={{ fontWeight: "300" }}>
                    Your Rewards
                  </h4>
                  <h5
                    style={{
                      marginTop: "20px",
                      marginBottom: "20px",
                      fontWeight: "400",
                      color: "yellow",
                    }}
                  >
                    <span id="rewards" style={{ color: "white" }}>
                    0
                    </span>{" "}
                    RLAM
                  </h5>
                  <Button
                    onClick={harvest}
                    pool={farm.id}
                    style={{
                      backgroundColor: "#ffffff10",
                      boxShadow: "1px 1px 5px #000000",
                      marginBottom: "20px",
                      width: "60%",
                    }}
                  >
                    Harvest
                  </Button>
                  <h4 className="pt-3" style={{ fontWeight: "300" }}>
                    Your Staked Balance
                  </h4>
                  <h5
                    style={{
                      marginTop: "20px",
                      marginBottom: "20px",
                      fontWeight: "400",
                      color: "yellow",
                    }}
                  >
                    <span id="stakedBalance" style={{ color: "white" }}>
                      0
                    </span>{" "}
                    LP
                  </h5>
                </div>
              </form>
            </div>
          </div>
        </div>
      )
    })}
  </div>
</div>
)
}
