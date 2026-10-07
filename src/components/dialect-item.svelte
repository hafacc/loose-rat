<script lang="ts">
  import type { SvelteSet } from "svelte/reactivity";

  const {
    dialects,
    selected,
    name,
    heading = false,
  }: {
    /** dialect keys this tag turns on and off together */
    dialects: readonly string[];
    selected: SvelteSet<string>;
    name: string;
    /** whether the tag names a whole group */
    heading?: boolean;
  } = $props();

  const count = $derived(dialects.filter((key) => selected.has(key)).length);
  const checked = $derived(count === dialects.length);

  function toggle(): void {
    // decided once: `checked` changes as the set does
    const turnOff = checked;
    for (const key of dialects) {
      if (turnOff) {
        selected.delete(key);
      } else {
        selected.add(key);
      }
    }
  }
</script>

<label class="cursor-pointer">
  <input
    type="checkbox"
    class="peer sr-only"
    {checked}
    indeterminate={count > 0 && !checked}
    onchange={toggle}
  >
  <span
    class={[
      "inline-block rounded-full border-2 border-foreground px-3 py-0.5 peer-checked:bg-primary peer-checked:text-primary-foreground peer-indeterminate:stripes peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2",
      heading ? "font-bold" : "font-medium text-sm",
    ]}
  >
    {name}
  </span>
</label>
