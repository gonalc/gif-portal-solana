import twitterLogo from "./assets/twitter-logo.svg";
import "./App.css";
import { useEffect, useState } from "react";
import idl from './idl.json'
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';
import kp from './keypair.json'

const { SystemProgram } = web3

const arr = Object.values(kp._keypair.secretKey)
const secret = new Uint8Array(arr)
const baseAccount = web3.Keypair.fromSecretKey(secret)

const programID = new PublicKey(idl.metadata.address)

const network = clusterApiUrl('devnet')

const opts = {
  preflightCommitment: "processed"
}

// Constants
const TWITTER_HANDLE = "devsoos";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;


const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [gifList, setGifList] = useState([]);

  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log("Phantom wallet found!");

          const response = await solana.connect({ onlyIfTrusted: true });
          console.log(
            "Connected with Public Key:",
            response.publicKey.toString()
          );

          setWalletAddress(response.publicKey.toString());
        }
      } else {
        alert("Solana object not found! Get a Phantom Wallet 👻");
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  const getGifList = async () => {
    try {
      const provider = getProvider()
      const program = new Program(idl, programID, provider)
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey)

      console.log('Got the account: ', account)

      setGifList(account.gifList)
    } catch (error) {
      console.error('Error in getGifList: ', error)

      setGifList(null)
    }
  }

  const createGifAccount = async () => {
    try {
      const provider = getProvider()
      const program = new Program(idl, programID, provider)
      console.log('ping')

      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount]
      })

      console.log('Created a new BaseAccount w/ address: ', baseAccount.publicKey.toString())
      await getGifList()
    } catch (error) {
      console.error('Error creating BaseAccount account: ', error)
    }
  }

  useEffect(() => {
    if (walletAddress) {
      console.log("Fetching GIF list...");
      getGifList()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress]);

  /*
   * Let's define this method so our code doesn't break.
   * We will write the logic for this next!
   */
  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log("Connected with Public Key:", response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  const fakeVoteGif = gifLink => {
    const updatedGifs = gifList.map(g => {
      if (g.gifLink === gifLink) {
        return {
          ...g,
          votes: g.votes + 1
        }
      }

      return g
    })

    setGifList(updatedGifs)
  }

  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log("No link has been provided!");
      return
    } 

    console.log('Gif Link: ', inputValue)

    const value = inputValue
    setInputValue('')

    try {
      const provider = getProvider()
      const program = new Program(idl, programID, provider)

      await program.rpc.addGif(value, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        }
      })
      console.log('GIF successfully sent to ptogram: ', value)
      await getGifList()
    } catch (error) {
      console.error('Error sending the GIF: ', error)
    }
  };

  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  };

  const getProvider = () => {
    const { preflightCommitment } = opts

    const connection = new Connection(network, preflightCommitment)
    const provider = new Provider(connection, window.solana, preflightCommitment)

    return provider
  }

  const voteGif = async gifLink => {
    try {
      fakeVoteGif(gifLink)
      const provider = getProvider()
      const program = new Program(idl, programID, provider)

      await program.rpc.updateGif(gifLink, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        }
      })

      console.log('GIF UPDATED: ', gifLink)
      await getGifList()
    } catch (error) {
      console.error('Error voting: ', error)
    }
  }

  /*
   * We want to render this UI when the user hasn't connected
   * their wallet to our app yet.
   */
  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  );

  const renderConnectedContainer = () => {
    if (!gifList) {
      return (
        <div className="connected-container">
          <button className="cta-button submit-gif-button" onClick={createGifAccount}>
            Do One-Time Initialization For GIF Program Account
          </button>
        </div>
      )
    }

    return (
      <div className="connected-container">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            sendGif();
          }}
        >
          <input
            type="text"
            placeholder="Enter gif link!"
            value={inputValue}
            onChange={onInputChange}
          />
          <button type="submit" className="cta-button submit-gif-button">
            Submit
          </button>
        </form>
        <div className="gif-grid">
          {gifList.map((gif, index) => (
            <div className="gif-item" key={`${gif.link}-${index}`}>
              <img src={gif.gifLink} alt={gif.gifLink} />
              <div className="address-container">
                <p>{gif.userAddress.toString()}</p>
              </div>
              <div className="votes-container" onClick={() => voteGif(gif.gifLink)}>
                <p><strong>{gif.votes} ❤️</strong></p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (walletAddress) return renderConnectedContainer();

    return renderNotConnectedContainer();
  };

  return (
    <div className="App">
      <div className={walletAddress ? "authed-container" : "container"}>
        <div className="header-container">
          <p className="header">🖼 Pkmn Portal 🔥</p>
          <p className="sub-text">
            View your Pokemon GIF collection in the pokeverse ✨
          </p>
          {renderContent()}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
