// Fictional articles for the "Try an example" buttons (~200+ words each).
export interface Example { id: string; label: string; text: string }

export const EXAMPLES: Example[] = [
  {
    id: "sports",
    label: "Sports",
    text: `Riverside United won the national cup on Saturday, beating Northgate Athletic 3-2 in extra time in front of 62,000 fans at the capital stadium. Substitute Marta Kovac scored the winner in the 114th minute, curling a left-footed shot into the far corner after a quick counter-attack down the right flank.

Northgate had led twice, first through a header from captain Daniel Ocampo and again after a penalty early in the second half, but Riverside's pressing wore down their defence as the match wore on. Goalkeeper Sam Lindqvist made three saves in the final ten minutes of normal time to keep the score level, including a fingertip stop from a free kick that drew a standing ovation from the home end.

It is the club's first major trophy in eleven years, and manager Elena Ruiz said the celebration would last well into the week. "Nobody believed in us in September," she told reporters on the pitch, still holding the cup. "These players kept running when their legs were gone."

Riverside now qualifies for next season's continental tournament, where they will join the league champions in the group stage. Northgate, who finished fourth in the league, will return to domestic action next weekend against a side fighting relegation. Fans are expected to line the streets for an open-top bus parade on Monday afternoon, and the club has already confirmed that tickets for the parade route will not be required.`,
  },
  {
    id: "tech",
    label: "Technology",
    text: `Lumen Labs announced on Tuesday a new open-source chip design that it says can run large language models on a laptop using a fraction of the power of today's graphics processors. The company showed a prototype board performing real-time speech translation while drawing less than ten watts, roughly the consumption of a household LED bulb.

The design, called Ember, places memory directly next to the processing cores, which reduces the energy lost moving data back and forth. Chief engineer Priya Raman said the approach could cut the cost of running AI features on phones, cars and home appliances. "Most of the electricity in AI goes into moving numbers around, not calculating with them," she said at the launch event.

Lumen plans to publish the full specifications under a permissive licence next month so that other manufacturers can build compatible hardware. Two European device makers have already signed letters of intent to test the chips in consumer products by early next year.

Analysts welcomed the news but urged caution. Independent benchmarks have not yet been published, and previous efficiency claims in the sector have often shrunk once chips were tested on real workloads. Software support is another hurdle, because developers must adapt their programs to the new architecture. Lumen says it will release a compiler and a set of sample applications alongside the specifications, and will host a developer conference in the spring to help early adopters get started.`,
  },
  {
    id: "health",
    label: "Health",
    text: `A large clinical trial has found that a daily 30-minute brisk walk lowered blood pressure in adults with mild hypertension about as much as a low dose of common medication, researchers reported on Wednesday. The study followed 2,400 volunteers aged 40 to 70 across nine hospitals for two years and was published in a leading medical journal.

Participants who walked five days a week saw their systolic blood pressure fall by an average of eight points, while those who kept their usual routine saw almost no change. The walking group also reported better sleep and lower stress, although the researchers said these outcomes were measured by questionnaire and should be treated carefully.

Lead author Dr. Amara Okafor said the results do not mean patients should stop taking prescribed medicine. "Exercise is a powerful tool, and for many people with mild readings it is a sensible first step, but decisions about treatment belong between a patient and their doctor," she said.

Health officials welcomed the findings and said they would review national guidance on lifestyle advice for people with raised blood pressure. Cardiologists not involved in the study noted that volunteers were more motivated than the general population, so real-world results may be smaller. The team now plans a follow-up trial testing whether short group walking programmes run by community centres can help people keep up the habit for longer than twelve months.`,
  },
];
