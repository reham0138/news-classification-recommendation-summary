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
  const [text, setText] = useState(""); // shared by Analyze and Summarize
  return (
    <>
      <a href="#analyze" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-20 focus:bg-accent focus:px-3 focus:py-2 focus:text-onaccent">Skip to the analyzer</a>
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <Hero conn={conn} meta={meta} />
        <main>
          <Section id="analyze" title="Analyze an article" intro="Get its category, how sure the model is, and the closest stories in the archive.">
            <Analyze text={text} setText={setText} meta={meta} />
          </Section>
          <Section id="summarize" title="Summarize with an agent" intro="An AI agent reads, classifies and writes. Every step it takes is shown.">
            <Summarize text={text} meta={meta} />
          </Section>
          <Section id="search" title="Search the archive" intro="Find articles by topic, even when the words don’t match exactly.">
            <Search meta={meta} />
          </Section>
        </main>
        <Footer meta={meta} />
      </div>
    </>
  );
}
