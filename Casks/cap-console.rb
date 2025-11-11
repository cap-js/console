cask "cap-console" do
  arch arm: "arm64", intel: "x64"
  os macos: "darwin"

  version "1.1.0"
  sha256 arm:          "a287129920acd65a99b8edd99c15b5142432c8da4bde35a58a1155a24ecc3c45",
         intel:        "c222a4b576320d49078518fef1249493fba292d414eb3b80506500f2e07dab94"

  url "https://cap-console-updater.cfapps.eu10-005.hana.ondemand.com/#{arch}-cap-console.dmg",
    verified: "cap-console-updater.cfapps.eu10-005.hana.ondemand.com"
  name "CAP Console"
  desc "Your friendly helper tool for CAP development."
  homepage "https://cap.cloud.sap/docs/tools/console"

  livecheck do
    url "https://cap-console-updater.cfapps.eu10-005.hana.ondemand.com/latest-mac.yml"
    strategy :electron_builder
  end

  auto_updates true

  app "CAP Console.app"

  zap trash: [
    "~/Library/Application Support/CAP Console",
    "~/Library/Caches/capconsole-updater",
    "~/Library/Logs/CAP Console",
  ]

  caveats do
    license "https://tools.hana.ondemand.com/developer-license-3_1.txt"
  end
end
