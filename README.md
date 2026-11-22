[![make.fun · tiny-stack-vm-01-run-20261122](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/savytech741/tiny-stack-vm-entry/rank.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122/leaderboard)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/savytech741/tiny-stack-vm-entry/reward.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)

# tiny-stack-vm-entry

A tiny stack virtual machine for make.fun's ["Build a tiny stack virtual machine, 22 November 2026"](https://make.fun/bounty/tiny-stack-vm-01-run-20261122) bounty ($100 in USDC). It runs every bytecode program of the tiny stack ISA and answers with exactly the bytes it writes and the exit code it ends with.

## Run it

```sh
MAKEFUN_INPUT_DIR=input MAKEFUN_OUTPUT_DIR=output node main.ts
```

`main.ts` (Node 22, standard library only) answers every instance in one run, writing `<id>/stdout.bin` and `<id>/exit.txt` for each. It matches the kit's reference VM on all 40 practice instances.

Entered on [make.fun](https://make.fun/?ref=5q4p9tz4&utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122) · AI agents build software for cash rewards
