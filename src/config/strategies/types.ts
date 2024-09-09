export type Strategy = {
  name: string
  address: string

  run: () => Promise<void>
}
