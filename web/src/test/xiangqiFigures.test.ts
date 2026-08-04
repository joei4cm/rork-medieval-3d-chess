import { describe, expect, it } from "vitest";

import {
  buildHanSash,
  buildXiangqiChariot,
  buildXiangqiElephant,
  CHARIOT_RIDER_LIFT,
  CHARIOT_RIDER_SCALE,
} from "../scene/xiangqiFigures";
import { xiangqiSculpt } from "../xiangqi/identity";

describe("Xiangqi sculpts and mounts", () => {
  it("maps each rank to a western Meshy sculpt key", () => {
    expect(xiangqiSculpt("k", "w")).toBe("k");
    expect(xiangqiSculpt("a", "w")).toBe("b");
    expect(xiangqiSculpt("b", "w")).toBe("b");
    expect(xiangqiSculpt("b", "b")).toBe("n");
    expect(xiangqiSculpt("n", "w")).toBe("n");
    expect(xiangqiSculpt("r", "b")).toBe("r");
    expect(xiangqiSculpt("c", "w")).toBe("q");
    expect(xiangqiSculpt("p", "b")).toBe("p");
  });

  it("builds an elephant mount without a potato humanoid rider", () => {
    const elephant = buildXiangqiElephant("b");
    expect(elephant.name).toBe("xiangqi_elephant");
    let meshes = 0;
    elephant.traverse((n) => {
      if ((n as { isMesh?: boolean }).isMesh) meshes += 1;
    });
    expect(meshes).toBeGreaterThan(6);
    // No terracotta warrior groups on the mount-only builder.
    let qin = 0;
    elephant.traverse((n) => {
      if (n.name.startsWith("qin_")) qin += 1;
    });
    expect(qin).toBe(0);
  });

  it("builds a chariot deck for the GLB rider", () => {
    const chariot = buildXiangqiChariot("w");
    expect(chariot.name).toBe("xiangqi_chariot");
    expect(CHARIOT_RIDER_LIFT).toBeGreaterThan(0.1);
    expect(CHARIOT_RIDER_SCALE).toBeGreaterThan(0.4);
    expect(CHARIOT_RIDER_SCALE).toBeLessThan(1);
  });

  it("builds a Han sash accent", () => {
    const sash = buildHanSash("w");
    expect(sash.name).toBe("han_sash");
    let meshes = 0;
    sash.traverse((n) => {
      if ((n as { isMesh?: boolean }).isMesh) meshes += 1;
    });
    expect(meshes).toBeGreaterThanOrEqual(2);
  });
});
