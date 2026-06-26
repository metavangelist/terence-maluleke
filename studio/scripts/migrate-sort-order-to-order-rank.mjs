import { getCliClient } from "sanity/cli";
import { LexoRank } from "lexorank";

const client = getCliClient({ apiVersion: "2024-01-01" });

const TYPES = ["artwork", "assamblage", "studyImage"];

for (const type of TYPES) {
  const docs = await client.fetch(
    `*[_type == $type] | order(sortOrder asc, title asc, _createdAt asc){ _id, sortOrder, orderRank }`,
    { type }
  );

  if (!docs.length) {
    console.log(`No ${type} documents to migrate.`);
    continue;
  }

  let rank = LexoRank.min();
  const tx = client.transaction();

  docs.forEach((doc, index) => {
    rank = rank.genNext();
    tx.patch(doc._id, {
      set: { orderRank: rank.toString() },
      unset: ["sortOrder"],
    });
    console.log(`${type}: ${doc._id} -> ${index}`);
  });

  await tx.commit();
  console.log(`Migrated ${docs.length} ${type} document(s).`);
}

console.log("Order migration complete.");
