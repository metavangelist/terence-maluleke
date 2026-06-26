import { getCliClient } from "sanity/cli";

const client = getCliClient({ apiVersion: "2024-01-01" });

await client
  .patch("artistInfo")
  .unset(["bio", "bioPlain"])
  .commit();

console.log("Artist bio cleared — site will use the default text until new content is published.");
