/**
 * seed-sample-acts.ts
 *
 * Seeds the knowledge base with sample sections from 3 key Indian acts.
 * Uses OpenAI for embeddings only (no scraping needed).
 *
 * Usage: cd packages/server && npx tsx scripts/seed-sample-acts.ts
 *
 * This is for LOCAL DEVELOPMENT TESTING. For production, use the full
 * seed-knowledge-base.ts with actual bare act text files.
 */

import "dotenv/config";
import {
  type ChunkRecord,
  generateEmbeddings,
  insertChunks,
  isSourceIngested,
  getSupabase,
  log,
} from "./lib/ingest-utils.js";

interface SampleSection {
  source_title: string;
  section_ref: string;
  content: string;
}

// Key sections from 3 essential acts — enough to test RAG pipeline
const SAMPLE_SECTIONS: SampleSection[] = [
  // Bharatiya Nyaya Sanhita, 2023 (replaced IPC)
  {
    source_title: "Bharatiya Nyaya Sanhita, 2023",
    section_ref: "Section 1",
    content:
      "Section 1. Short title, commencement and application.\n" +
      "(1) This Act may be called the Bharatiya Nyaya Sanhita, 2023.\n" +
      "(2) It shall come into force on such date as the Central Government may, by notification in the Official Gazette, appoint.\n" +
      "(3) Every person shall be liable to punishment under this Sanhita and not otherwise for every act or omission contrary to the provisions thereof, of which he shall be guilty within India.",
  },
  {
    source_title: "Bharatiya Nyaya Sanhita, 2023",
    section_ref: "Section 100",
    content:
      "Section 100. Murder.\n" +
      "Whoever commits murder shall be punished with death or imprisonment for life, and shall also be liable to fine.\n" +
      "Explanation — If the act by which the death is caused is done with the intention of causing death, or if it is done with the intention of causing such bodily injury as the offender knows to be likely to cause the death of the person to whom the harm is caused, or if it is done with the intention of causing bodily injury to any person and the bodily injury intended to be inflicted is sufficient in the ordinary course of nature to cause death, it shall be deemed to be murder.",
  },
  {
    source_title: "Bharatiya Nyaya Sanhita, 2023",
    section_ref: "Section 303",
    content:
      "Section 303. Theft.\n" +
      "Whoever, intending to take dishonestly any movable property out of the possession of any person without that person's consent, moves that property in order to such taking, is said to commit theft.\n" +
      "Explanation 1 — A thing so long as it is attached to the earth, not being movable property, is not the subject of theft; but it becomes capable of being the subject of theft as soon as it is severed from the earth.\n" +
      "Explanation 2 — A moving effected by the same act which effects the severance may be a theft.",
  },
  {
    source_title: "Bharatiya Nyaya Sanhita, 2023",
    section_ref: "Section 316",
    content:
      "Section 316. Criminal breach of trust.\n" +
      "Whoever, being in any manner entrusted with property, or with any dominion over property, dishonestly misappropriates or converts to his own use that property, or dishonestly uses or disposes of that property in violation of any direction of law prescribing the mode in which such trust is to be discharged, or of any legal contract, express or implied, which he has made touching the discharge of such trust, or wilfully suffers any other person so to do, commits criminal breach of trust.",
  },
  {
    source_title: "Bharatiya Nyaya Sanhita, 2023",
    section_ref: "Section 318",
    content:
      "Section 318. Cheating.\n" +
      "Whoever, by deceiving any person, fraudulently or dishonestly induces the person so deceived to deliver any property to any person, or to consent that any person shall retain any property, or intentionally induces the person so deceived to do or omit to do anything which he would not do or omit if he were not so deceived, and which act or omission causes or is likely to cause damage or harm to that person in body, mind, reputation or property, is said to cheat.",
  },

  // Indian Contract Act, 1872
  {
    source_title: "Indian Contract Act, 1872",
    section_ref: "Section 2",
    content:
      "Section 2. Interpretation clause.\n" +
      "(a) When one person signifies to another his willingness to do or to abstain from doing anything, with a view to obtaining the assent of that other to such act or abstinence, he is said to make a proposal.\n" +
      "(b) When the person to whom the proposal is made signifies his assent thereto, the proposal is said to be accepted. A proposal, when accepted, becomes a promise.\n" +
      "(c) The person making the proposal is called the promisor, and the person accepting the proposal is called the promisee.\n" +
      "(d) When, at the desire of the promisor, the promisee or any other person has done or abstained from doing, or does or abstains from doing, or promises to do or to abstain from doing, something, such act or abstinence or promise is called a consideration for the promise.\n" +
      "(e) Every promise and every set of promises, forming the consideration for each other, is an agreement.\n" +
      "(f) Promises which form the consideration or part of the consideration for each other are called reciprocal promises.\n" +
      "(g) An agreement not enforceable by law is said to be void.\n" +
      "(h) An agreement enforceable by law is a contract.\n" +
      "(i) An agreement which is enforceable by law at the option of one or more of the parties thereto, but not at the option of the other or others, is a voidable contract.\n" +
      "(j) A contract which ceases to be enforceable by law becomes void when it ceases to be enforceable.",
  },
  {
    source_title: "Indian Contract Act, 1872",
    section_ref: "Section 10",
    content:
      "Section 10. What agreements are contracts.\n" +
      "All agreements are contracts if they are made by the free consent of parties competent to contract, for a lawful consideration and with a lawful object, and are not hereby expressly declared to be void.",
  },
  {
    source_title: "Indian Contract Act, 1872",
    section_ref: "Section 23",
    content:
      "Section 23. What considerations and objects are lawful, and what not.\n" +
      "The consideration or object of an agreement is lawful, unless it is forbidden by law; or is of such a nature that, if permitted, it would defeat the provisions of any law; or is fraudulent; or involves or implies injury to the person or property of another; or the Court regards it as immoral, or opposed to public policy. In each of these cases, the consideration or object of an agreement is said to be unlawful. Every agreement of which the object or consideration is unlawful is void.",
  },
  {
    source_title: "Indian Contract Act, 1872",
    section_ref: "Section 73",
    content:
      "Section 73. Compensation for loss or damage caused by breach of contract.\n" +
      "When a contract has been broken, the party who suffers by such breach is entitled to receive, as compensation for any loss or damage caused to him thereby, such compensation as naturally arose in the usual course of things from such breach, or which the parties knew, when they made the contract, to be likely to result from the breach of it. Such compensation is not to be given for any remote and indirect loss or damage sustained by reason of the breach.",
  },

  // Constitution of India (key fundamental rights)
  {
    source_title: "Constitution of India",
    section_ref: "Article 14",
    content:
      "Article 14. Equality before law.\n" +
      "The State shall not deny to any person equality before the law or the equal protection of the laws within the territory of India.",
  },
  {
    source_title: "Constitution of India",
    section_ref: "Article 19",
    content:
      "Article 19. Protection of certain rights regarding freedom of speech, etc.\n" +
      "(1) All citizens shall have the right—\n" +
      "(a) to freedom of speech and expression;\n" +
      "(b) to assemble peaceably and without arms;\n" +
      "(c) to form associations or unions or co-operative societies;\n" +
      "(d) to move freely throughout the territory of India;\n" +
      "(e) to reside and settle in any part of the territory of India;\n" +
      "(g) to practise any profession, or to carry on any occupation, trade or business.\n" +
      "(2) Nothing in sub-clause (a) of clause (1) shall affect the operation of any existing law, or prevent the State from making any law, in so far as such law imposes reasonable restrictions on the exercise of the right conferred by the said sub-clause in the interests of the sovereignty and integrity of India, the security of the State, friendly relations with foreign States, public order, decency or morality, or in relation to contempt of court, defamation or incitement to an offence.",
  },
  {
    source_title: "Constitution of India",
    section_ref: "Article 21",
    content:
      "Article 21. Protection of life and personal liberty.\n" +
      "No person shall be deprived of his life or personal liberty except according to procedure established by law.\n" +
      "Article 21 has been interpreted expansively by the Supreme Court to include right to live with dignity, right to livelihood, right to health, right to education, right to privacy, right to shelter, right to clean environment, and right to speedy trial among other rights.",
  },
  {
    source_title: "Constitution of India",
    section_ref: "Article 32",
    content:
      "Article 32. Remedies for enforcement of rights conferred by this Part.\n" +
      "(1) The right to move the Supreme Court by appropriate proceedings for the enforcement of the rights conferred by this Part is guaranteed.\n" +
      "(2) The Supreme Court shall have power to issue directions or orders or writs, including writs in the nature of habeas corpus, mandamus, prohibition, quo warranto and certiorari, whichever may be appropriate, for the enforcement of any of the rights conferred by this Part.\n" +
      "(3) Without prejudice to the powers conferred on the Supreme Court by clauses (1) and (2), Parliament may by law empower any other court to exercise within the local limits of its jurisdiction all or any of the powers exercisable by the Supreme Court under clause (2).",
  },
  {
    source_title: "Constitution of India",
    section_ref: "Article 226",
    content:
      "Article 226. Power of High Courts to issue certain writs.\n" +
      "(1) Notwithstanding anything in article 32, every High Court shall have power, throughout the territories in relation to which it exercises jurisdiction, to issue to any person or authority, including in appropriate cases, any Government, within those territories directions, orders or writs, including writs in the nature of habeas corpus, mandamus, prohibition, quo warranto and certiorari, or any of them, for the enforcement of any of the rights conferred by Part III and for any other purpose.\n" +
      "(2) The power conferred by clause (1) to issue directions, orders or writs to any Government, authority or person may also be exercised by any High Court exercising jurisdiction in relation to the territories within which the cause of action, wholly or in part, arises for the exercise of such power, notwithstanding that the seat of such Government or authority or the residence of such person is not within those territories.",
  },
];

async function main() {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║    Nyay Sahayak — Sample Knowledge Base Seed    ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // Preflight
  const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "OPENAI_API_KEY"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`Missing env vars: ${missing.join(", ")}`);
    process.exit(1);
  }

  // Check DB
  const supabase = getSupabase();
  const { count } = await supabase
    .from("legal_chunks")
    .select("id", { count: "exact", head: true });
  log(`Current chunks in database: ${count ?? 0}`);

  // Skip already-ingested sources
  const toIngest: SampleSection[] = [];
  const sources = [...new Set(SAMPLE_SECTIONS.map((s) => s.source_title))];

  for (const source of sources) {
    if (await isSourceIngested(source)) {
      log(`SKIP ${source} — already ingested`);
    } else {
      toIngest.push(...SAMPLE_SECTIONS.filter((s) => s.source_title === source));
    }
  }

  if (toIngest.length === 0) {
    log("Nothing to ingest — all sample acts already present.");
    return;
  }

  log(`Generating embeddings for ${toIngest.length} sections...`);
  const embeddings = await generateEmbeddings(toIngest.map((s) => s.content));

  const records: ChunkRecord[] = toIngest.map((s, i) => ({
    source_type: "act" as const,
    source_title: s.source_title,
    section_ref: s.section_ref,
    content: s.content,
    summary: s.content.split("\n")[0], // First line as summary
    embedding: embeddings[i],
    metadata: { seed: true },
  }));

  log(`Inserting ${records.length} chunks...`);
  const inserted = await insertChunks(records);
  log(`Done! Inserted ${inserted} chunks.`);

  const { count: finalCount } = await supabase
    .from("legal_chunks")
    .select("id", { count: "exact", head: true });
  log(`Total chunks in database: ${finalCount ?? 0}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
