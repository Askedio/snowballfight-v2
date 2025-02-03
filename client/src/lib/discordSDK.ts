import {
  CommandResponse,
  DiscordSDK,
  DiscordSDKMock,
} from "@discord/embedded-app-sdk";
type Auth = CommandResponse<"authenticate">;
let auth: Auth;

const queryParams = new URLSearchParams(window.location.search);
const isEmbedded = queryParams.get("frame_id") !== null;

let discordSdk: DiscordSDK | DiscordSDKMock;

const initiateDiscordSDK = async () => {
  if (isEmbedded) {
    discordSdk = new DiscordSDK("1335694934350495845");
    await discordSdk.ready();
  } else {
    // We're using session storage for user_id, guild_id, and channel_id
    // This way the user/guild/channel will be maintained until the tab is closed, even if you refresh
    // Session storage will generate new unique mocks for each tab you open
    // Any of these values can be overridden via query parameters
    // i.e. if you set https://my-tunnel-url.com/?user_id=test_user_id
    // this will override this will override the session user_id value
    const mockUserId = getOverrideOrRandomSessionValue("user_id");
    const mockGuildId = getOverrideOrRandomSessionValue("guild_id");
    const mockChannelId = getOverrideOrRandomSessionValue("channel_id");

    discordSdk = new DiscordSDKMock(
      "1335694934350495845",
      mockGuildId,
      mockChannelId,
      null
    );

    const discriminator = String(mockUserId.charCodeAt(0) % 5);

    discordSdk._updateCommandMocks({
      authenticate: async () => {
        return await {
          access_token: "mock_token",
          user: {
            username: mockUserId,
            discriminator,
            id: mockUserId,
            avatar: null,
            public_flags: 1,
          },
          scopes: [],
          expires: new Date(2112, 1, 1).toString(),
          application: {
            description: "mock_app_description",
            icon: "mock_app_icon",
            id: "mock_app_id",
            name: "mock_app_name",
          },
        };
      },
    });
  }
};

// Pop open the OAuth permission modal and request for access to scopes listed in scope array below
const authorizeDiscordUser = async () => {
  if (!isEmbedded) {
    return;
  }

  const { code } = await discordSdk.commands.authorize({
    client_id: "1335694934350495845",
    response_type: "code",
    state: "",
    prompt: "none",
    scope: ["identify", "guilds", "applications.commands"], //  "activities.write"
  });

  // Retrieve an access_token from your application's server
  const response = await fetch("/.proxy/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code,
    }),
  });
  const { access_token } = await response.json();

  // Authenticate with Discord client (using the access_token)
  auth = await discordSdk.commands.authenticate({
    access_token,
  });
};

const getUserInformation = async () => {
  try {
    /*await discordSdk.commands.setActivity({
      activity: {
        type: 0,
        details: "Throwing Snowballs!",
        state: "In Game",
        assets: {
          large_image: "logo",
          large_text: "in a group",
          small_image: "logo",
          small_text: "in game",
        },
      },
    });*/
  } catch (e) {
    console.log(e);
  }

  if (!auth) {
    return {
      username: "",
      channel: "",
      guild_id: "",
    };
  }

  let activityChannelName = "Unknown";
  let guild_id = "";

  // Requesting the channel in GDMs (when the guild ID is null) requires
  // the dm_channels.read scope which requires Discord approval.
  if (discordSdk.channelId != null && discordSdk.guildId != null) {
    // Over RPC collect info about the channel
    const channel = await discordSdk.commands.getChannel({
      channel_id: discordSdk.channelId,
    });
    if (channel.name != null) {
      activityChannelName = channel.name;
      guild_id = channel.guild_id;
    }
  }

  return {
    username: auth.user.username,
    channel: activityChannelName,
    guild_id,
  };
};

enum SessionStorageQueryParam {
  user_id = "user_id",
  guild_id = "guild_id",
  channel_id = "channel_id",
}

function getOverrideOrRandomSessionValue(
  queryParam: `${SessionStorageQueryParam}`
) {
  const overrideValue = queryParams.get(queryParam);
  if (overrideValue != null) {
    return overrideValue;
  }

  const currentStoredValue = sessionStorage.getItem(queryParam);
  if (currentStoredValue != null) {
    return currentStoredValue;
  }

  // Set queryParam to a random 8-character string
  const randomString = Math.random().toString(36).slice(2, 10);
  sessionStorage.setItem(queryParam, randomString);
  return randomString;
}

export { discordSdk, initiateDiscordSDK, authorizeDiscordUser, getUserInformation, isEmbedded };
