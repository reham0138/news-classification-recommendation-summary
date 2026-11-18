import { useState } from "react";
import { useBackend } from "./hooks";
import Analyze from "./components/Analyze";
import Footer from "./components/Footer";
import Hero from "./components/Hero";
import Search from "./components/Search";
import Section from "./components/Section";
import Summarize from "./components/Summarize";

export default function App() {
  const { conn, meta } = useBackend();
  const [text, setText] = useState("");
  return (
    <>
      <a href="#article" className="skip-link">Skip to article workspace</a>
      <div className="site-shell">
        <Hero conn={conn} meta={meta} />
        <main className="pb-16">
          <Section id="article" title="Your article, your insight" intro="Paste a news story once. Choose what you want the newsroom assistant to do with it.">
            <div className="workspace-panel">
              <div className="workspace-kicker"><span className="live-dot" /> ARTICLE WORKSPACE <span className="workspace-number">01</span></div>
              <Analyze text={text} setText={setText} meta={meta} />
              <div className="action-divider"><span>WHAT WOULD YOU LIKE TO DO?</span></div>
              <Summarize text={text} meta={meta} />
            </div>
          </Section>
          <Section id="search" title="Explore the signal" intro="Search your archive by topic, event, or idea — not just exact wording.">
            <Search meta={meta} />
          </Section>
        </main>
        <Footer meta={meta} />
      </div>
    </>
  );
}
