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
      <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
        <Hero conn={conn} meta={meta} />
        <main className="pb-4">
          <Section id="analyze" title="Analyze an article" intro="Give a story its place: see the predicted desk, confidence levels, and the closest reporting in your archive.">
            <Analyze text={text} setText={setText} meta={meta} />
          </Section>
          <Section id="summarize" title="The essential briefing" intro="An AI agent extracts key facts and produces a concise, structured account. Follow every step it takes.">
            <Summarize text={text} meta={meta} />
          </Section>
          <Section id="search" title="Explore the archive" intro="Search by meaning, not just matching words. Find related reporting across your collection.">
            <Search meta={meta} />
          </Section>
        </main>
        <Footer meta={meta} />
      </div>
    </>
  );
}
