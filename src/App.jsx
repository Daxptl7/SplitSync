import "./App.css";
import Bitcoin from "./components/Bitcoin";
import { Canvas } from "@react-three/fiber";

function App() {
  return (
    <>
      <main>
        <div className="images">
          <img id="genesis-block" src="/blockchain_bg_1.png" />
          <img id="smart-contracts" src="/blockchain_bg_2.png" />
          <img id="defi-ecosystem" src="/blockchain_bg_3.png" />
          <img id="consensus" src="/blockchain_bg_4.png" />
          <img id="cryptography" src="/blockchain_bg_1.png" />
          <img id="web3-arch" src="/blockchain_bg_3.png" />
        </div>
        <Canvas
          id="canvas-elem"
          style={{
            height: "100vh",
            width: "100vw",
            position: "fixed",
            top: 0,
            left: 0,
            zIndex: 1,
          }}
        >
          <Bitcoin />
        </Canvas>
        <section id="section-1">
          <nav>
            <div className="nav-elem">
              <h1>GENESIS</h1>
            </div>
            <div className="nav-elem">
              <i className="ri-arrow-right-s-line"></i> Courses
            </div>
            <div className="nav-elem">
              <i className="ri-menu-3-line"></i>
            </div>
          </nav>
          <div className="middle">
            <div className="left">
              <h1>
                Master <br /> The <br /> Block <br /> Chain
              </h1>
            </div>
            <div className="right"></div>
          </div>
          <div className="bottom">
            <div className="left"></div>
            <div className="right">
              <div className="text-container">
                <h2>
                  Genesis is a premier educational platform at the
                  intersection of finance, technology, and decentralization.
                </h2>
                <h3>
                  Our goal is to deliver in-depth knowledge that empowers people
                  to build the future of Web3, DeFi, and Smart Contracts.
                </h3>
                <p>Discord / Twitter / Github / Community</p>
              </div>
            </div>
          </div>

          <div className="first-line"></div>
          <div className="second-line"></div>
        </section>
        <section id="section-2">
          <div className="titles">
            <div className="title">
              <small style={{ visibility: "hidden" }}>2025 - UPCOMING</small>
              <small>FEATURED LECTURES</small>
            </div>
            <div img-title="genesis-block" className="title">
              <small>MODULE 01</small>
              <h1>The Genesis Block</h1>
            </div>
            <div img-title="smart-contracts" className="title">
              <small>MODULE 02</small>
              <h1>Smart Contracts</h1>
            </div>
            <div img-title="defi-ecosystem" className="title">
              <small>MODULE 03</small>
              <h1>DeFi Ecosystem</h1>
            </div>
            <div img-title="consensus" className="title">
              <small>MODULE 04</small>
              <h1>Consensus Mechanisms</h1>
            </div>
            <div img-title="cryptography" className="title">
              <small>MODULE 05</small>
              <h1>Cryptography 101</h1>
            </div>
            <div img-title="web3-arch" className="title">
              <small>MODULE 06</small>
              <h1>Web3 Architecture</h1>
            </div>
          </div>
        </section>
        <section id="section-3">
          <div className="top">
            <div className="left">
              <div className="text-con">
                <div>
                  <small>OUR METHODOLOGY</small>
                </div>
                <div>
                  <h3>
                    We're structuring <br /> complex <br /> concepts aimed{" "}
                    <br /> at improving <br /> understanding
                  </h3>
                </div>
              </div>
            </div>
            <div className="right"></div>
          </div>
        </section>
        <section id="section-4">
          <div className="bottom">
            <div className="left"></div>
            <div className="right">
              <div>
                <p>
                  Genesis is a decentralized education hub working globally from
                  nodes all over the world.
                </p>
                <p>
                  Our strong focus on producing high quality & accessible
                  content for developers, investors and enthusiasts became a
                  standard.
                </p>
              </div>
              <div>
                <p>
                  We're passionate about educating people and solving problems for
                  the next generation of the internet.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export default App;
