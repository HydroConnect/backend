/// <reference types="vitest" />
import { defineConfig } from "vite";
import { BaseSequencer, TestSpecification, Vitest } from "vitest/node";

const testFiles = ["rest_v1.ts", "io_v1.ts"];

class MySequencer extends BaseSequencer {
    protected ctx: Vitest;

    constructor(ctx: Vitest) {
        super(ctx);
        this.ctx = ctx;
    }

    async sort(specs: TestSpecification[]) {
        return specs.sort((a: TestSpecification, b: TestSpecification) => {
            const res =
                testFiles.indexOf(a.moduleId.split("/").at(-1)!) -
                testFiles.indexOf(b.moduleId.split("/").at(-1)!);
            return res == 0 ? 0 : res < 0 ? -1 : 1;
        });
    }
}

export default defineConfig({
    test: {
        include: ["./tests/*.ts"],
        fileParallelism: false,
        sequence: {
            sequencer: MySequencer,
        },
        testTimeout: 10000,
    },
});
