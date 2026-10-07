<script lang="ts">
  import type { SvelteSet } from "svelte/reactivity";
  import type { Dialect } from "../lib/dialect-groups.ts";
  import DialectItem from "./dialect-item.svelte";

  const {
    name,
    dialects,
    selected,
    filter,
  }: {
    name: string;
    dialects: readonly Dialect[];
    selected: SvelteSet<string>;
    /** lower-case text a group or dialect name has to contain to be listed */
    filter: string;
  } = $props();

  const keys = $derived(dialects.map(({ key }) => key));
  const groupMatches = $derived(name.toLowerCase().includes(filter));
  const listed = $derived(
    groupMatches
      ? dialects
      : dialects.filter((dialect) =>
          dialect.name.toLowerCase().includes(filter),
        ),
  );
  let expanded = $state(false);
  // a group listed for one of its dialects has to show that dialect
  const open = $derived(expanded || !groupMatches);

  function toggle(): void {
    expanded = !expanded;
  }
</script>

{#if dialects.length === 1}
  {#if groupMatches}
    <div><DialectItem dialects={keys} {selected} {name} heading /></div>
  {/if}
{:else if listed.length > 0}
  <div class="flex flex-col gap-y-1.5">
    <div class="flex items-center gap-x-1.5">
      <DialectItem dialects={keys} {selected} {name} heading />
      <button
        type="button"
        class="grid size-7 place-items-center rounded-full border-2 border-foreground"
        aria-label={name}
        aria-expanded={open}
        onclick={toggle}
      >
        <svg
          class={["size-3.5 transition-transform", open && "rotate-90"]}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M6 3l5 5-5 5" />
        </svg>
      </button>
    </div>
    {#if open}
      <div class="flex flex-wrap gap-1.5 pl-3">
        {#each listed as dialect (dialect.key)}
          <DialectItem
            dialects={[dialect.key]}
            {selected}
            name={dialect.name}
          />
        {/each}
      </div>
    {/if}
  </div>
{/if}
