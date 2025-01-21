import { nameByRace } from "fantasy-name-generator";

export class RandomNameGenerator {
  private races: {
    race: string;
    options?: { gender?: "male" | "female"; allowMultipleNames?: boolean };
  }[] = [
    { race: "angel", options: { gender: this.getRandomGender() } },
    { race: "cavePerson", options: { gender: this.getRandomGender() } },
    { race: "darkelf", options: { gender: this.getRandomGender() } },
    { race: "demon" },
    { race: "dragon", options: { gender: this.getRandomGender() } },
    { race: "drow", options: { gender: this.getRandomGender() } },
    { race: "dwarf", options: { gender: this.getRandomGender() } },
    { race: "elf", options: { gender: this.getRandomGender() } },
    { race: "fairy", options: { gender: this.getRandomGender() } },
    { race: "gnome", options: { gender: this.getRandomGender() } },
    { race: "goblin" },
    { race: "halfdemon", options: { gender: this.getRandomGender() } },
    { race: "halfling", options: { gender: this.getRandomGender() } },
    { race: "highelf", options: { gender: this.getRandomGender() } },
    { race: "highfairy", options: { gender: this.getRandomGender() } },
    { race: "human", options: { allowMultipleNames: true } },
    { race: "ogre" },
    { race: "orc" },
  ];

  private getRandomGender(): "male" | "female" {
    return Math.random() > 0.5 ? "male" : "female";
  }

  public generateRandomName(): { race: string; name: string } {
    const randomRace =
      this.races[Math.floor(Math.random() * this.races.length)];
    const name = nameByRace(randomRace.race, randomRace.options || {});
    return { race: randomRace.race, name };
  }
}
