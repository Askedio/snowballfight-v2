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
    const result = nameByRace(randomRace.race, randomRace.options || {});

    // Check if the result is an instance of Error
    if (result instanceof Error) {
      console.error("Error generating name:", result.message);
      return { race: randomRace.race, name: "Unknown" }; // Fallback name
    }

    return { race: randomRace.race, name: result }; // Safe to return
  }
}
