import React from "react";
import { IoAlertCircleOutline } from "react-icons/io5";

const pickupHelpText = [
  {
    type: "devil",
    title: "Infernal Fury",
    description: "Unlimited ammo & faster throws",
    image: "/assets/images/icons/candy_cane/blue_candy_cane.png",
  },
  {
    type: "skull",
    title: "Cursed Mark",
    description: "Drains your health",
    image: "/assets/images/icons/candy_cane/purple_candy_cane.png",
  },
  {
    type: "sword",
    title: "Blade Rush",
    description: "Throw faster",
    image: "/assets/images/icons/candy_cane/green_candy_cane.png",
  },
  {
    type: "treasure",
    title: "Vital Bounty",
    description: "Restores health",
    image: "/assets/images/icons/candy_cane/red_candy_cane.png",
  },
  {
    type: "wings",
    title: "Swift Flight",
    description: "Move faster",
    image: "/assets/images/icons/candy_cane/yellow_candy_cane.png",
  },
];

const PickupHelper: React.FC = () => {
  return (
    <div className="w-[200px] mx-auto bg-gray-800/90 rounded-r-lg shadow-lg p-2 text-xs border border-gray-600 border-l-0">
      <ul className="">
        {pickupHelpText.map((pickup) => (
          <li
            key={pickup.type}
            className="flex items-center gap-4 p-1.5  hover:scale-105 transition-transform"
          >
            <img
              src={pickup.image}
              alt={pickup.title}
              className="h-8 object-contain"
            />
            <div>{pickup.description}</div>
          </li>
        ))}
      </ul>

      <div className="mt-4 text-xs text-gray-300 border-t pt-3 border-gray-600 flex flex-col">
        <p className="!m-1">
          <span className="text-white">Move:</span> WASD/Arrow keys
        </p>

        <p className="!m-1">
          <span className="text-white">Shoot:</span> Space or Left Click
        </p>

        <p className="!m-1">
          <span className="text-white">Reload:</span> R or Right Click
        </p>

        <p className="!m-1">
          <span className="text-white">Sprint:</span> Shift Key
        </p>
      </div>
    </div>
  );
};

export default PickupHelper;
