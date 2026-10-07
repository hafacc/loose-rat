<script lang="ts">
  import type { EntryData } from "../lib/types.ts";

  // more remainders than this would bury the word they belong to
  const SHOWN = 3;

  const { word, ipa, side, cut, other }: EntryData = $props();

  // the letters that sound like the query, and the letters either side
  const parts = $derived(
    side === "start"
      ? ["", word.slice(0, cut), word.slice(cut)]
      : [word.slice(0, cut), word.slice(cut), ""],
  );
</script>

<div class="flex items-center justify-between gap-x-3">
  <div class="flex min-w-0 flex-col">
    <!-- flex, so the line breaks between the parts add no gaps to the word -->
    <span class="flex font-extrabold text-2xl leading-tight">
      <span>{parts[0]}</span>
      {#if parts[1] !== ""}
        <span class="mx-px rounded-lg bg-mark px-1 text-mark-foreground">
          {parts[1]}
        </span>
      {/if}
      <span>{parts[2]}</span>
    </span>
    <span class="text-muted-foreground text-sm">{ipa}</span>
  </div>
  <div class="flex flex-wrap justify-end gap-1.5">
    {#each other.slice(0, SHOWN) as remainder (remainder)}
      <span
        class="rounded-full bg-card px-3.5 py-0.5 font-bold text-card-foreground shadow-hard-sm"
      >
        {remainder}
      </span>
    {/each}
    {#if other.length > SHOWN}
      <span class="px-1 py-0.5 font-bold">+{other.length - SHOWN}</span>
    {/if}
  </div>
</div>
