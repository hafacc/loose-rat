<script lang="ts">
  import type { SvelteSet } from "svelte/reactivity";
  import { ALL_DIALECTS, DIALECT_GROUPS } from "../lib/dialect-groups.ts";
  import DialectGroup from "./dialect-group.svelte";
  import DialectItem from "./dialect-item.svelte";

  let {
    open = $bindable(),
    selected,
  }: {
    open: boolean;
    selected: SvelteSet<string>;
  } = $props();

  let dialog = $state<HTMLDialogElement>();
  $effect(() => {
    if (open) {
      dialog?.showModal();
    } else {
      dialog?.close();
    }
  });

  let typed = $state("");
  const filter = $derived(typed.trim().toLowerCase());

  function close(): void {
    open = false;
  }
</script>

<dialog
  bind:this={dialog}
  class="top-auto bottom-0 m-0 mx-auto h-[88%] max-h-none w-full max-w-lg translate-y-full rounded-t-3xl bg-sheet text-foreground transition-[translate,display,overlay] transition-discrete duration-300 backdrop:bg-backdrop/50 open:translate-y-0 starting:open:translate-y-full"
  onclose={close}
>
  <div class="flex h-full flex-col gap-y-3 p-4 pt-2">
    <div class="h-1.5 w-11 self-center rounded-full bg-foreground/30"></div>
    <header class="flex items-center gap-x-2">
      <h1 class="grow font-extrabold text-2xl">Dialect Choices</h1>
      <button
        type="button"
        class="rounded-full bg-primary px-4 py-1 font-bold text-primary-foreground"
        onclick={close}
      >
        Close
      </button>
    </header>
    <input
      class="rounded-full border-2 border-foreground bg-transparent px-4 py-2 placeholder:text-muted-foreground focus:outline-2 focus:outline-offset-2"
      bind:value={typed}
      placeholder="filter dialects..."
    >
    <div
      class="flex grow flex-col gap-y-2.5 overflow-y-auto overscroll-contain pr-2 [scrollbar-gutter:stable]"
    >
      {#if filter === ""}
        <div>
          <DialectItem
            dialects={ALL_DIALECTS}
            {selected}
            name="All Dialects"
            heading
          />
        </div>
      {/if}
      {#each DIALECT_GROUPS as [name, dialects] (name)}
        <DialectGroup {name} {dialects} {selected} {filter} />
      {/each}
    </div>
  </div>
</dialog>
