# UmaKuma conventions memory

- When fixing type-separation consistency, do a domain-level sweep (for example all `src/app/news/*.tsx` files), not one-off files.
- Move component/page `Props` and shared exported types into adjacent `*.types.ts` files and update all imports in the same pass.
