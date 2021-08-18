App = {
    web3Provider: null,
    contracts: {},

    init: async function () {
        await App.initWeb3();
        await App.connectWeb3();
        await App.bindEvents();
        await App.render();
    },

    initWeb3: async function () {
        if (window.ethereum) {
            console.log("Modern dapp browser");
            App.web3Provider = window.ethereum;
        } else if (window.web3) {
            console.log("Legacy dapp browser");
            App.web3Provider = window.web3.currentProvider;
        } else {
            console.log("No web3 provider available. You should consider trying MetaMask!");
            return;
        }

        // Check we are connected to correct chain
        const chainId = await App.web3Provider.request({
            method: "eth_chainId",
        });
        await App.checkChain(chainId);

        // Handle usefull events
        App.web3Provider.on("chainChanged", (chainId) =>
            window.location.reload()
        );
        App.web3Provider.on("accountsChanged", App.initAccount);
        App.web3Provider.on("connect", (connectInfo) =>
            App.checkChain(connectInfo.chainId)
        );
        App.web3Provider.on("disconnect", (error) => {
            console.error("web3 disconnected: " + error);
        });
    },

    checkChain: async (chainId) => {
        // 0x1=1337=ETH, 0x36=56=BSC, 0x539=1337=Localhost
        if (chainId != "0x539") {
            console.warn("Not connected to correct network");
            $("#invalid-network").show();
            return;
        }

        // Load contracts if we are on correct chain
        await App.initContracts();
    },

    connectWeb3: async function () {
        App.web3Provider
            .request({ method: "eth_requestAccounts" })
            .then(App.initAccount)
            .catch((err) => {
                if (err.code === 4001) {
                    // EIP-1193 userRejectedRequest error
                    // If this happens, the user rejected the connection request.
                    console.log("User denied account connection");
                } else {
                    console.error(err);
                }
            });
    },

    initAccount: async function () {
        const accounts = await App.web3Provider.request({
            method: "eth_accounts",
        });
        if (accounts.length === 0) {
            console.log("MetaMask is locked or the user has not connected any accounts");
            $("#account-link>span").html("Connect");
            App.account = null;
        } else if (accounts[0] !== App.account) {
            App.account = accounts[0];
            App.contracts.Betting.defaults({from: App.account});
            App.contracts.Token.defaults({from: App.account});

            // Render Account
            App.refreshWalletTokenAmount();

            // Check if there is a need to Approve
            let allowance = (await App.Token.allowance(App.account, App.Betting.address)).toNumber();
            if(allowance < 500000 * 10**18) {
                $("#not-approved").show();
                $("#btn-create-pool-modal").prop("disabled", true);
                $("#btn-create-pool").prop("disabled", true);
                $(".btn-join-positive").prop("disabled", true);
                $(".btn-join-negative").prop("disabled", true);
            }
            else {
                $("#not-approved").hide();
                $("#btn-create-pool-modal").prop("disabled", false);
                $("#btn-create-pool").prop("disabled", false);
                $(".btn-join-positive").prop("disabled", false);
                $(".btn-join-negative").prop("disabled", false);
            }
        }
    },
    refreshWalletTokenAmount: async function () {
        const accountTrunc = truncate(App.account);
        var tokenBalance = await App.Betting.tokenBalanceOf(App.account) / 10**18;
        $("#account-link>span").html(accountTrunc + " - " + tokenBalance.toFixed(4) + " $MCA");
    },

    switchNetwork: async function () {
        App.web3Provider.request({
            method: "wallet_addEthereumChain",
            params: [
                // {
                //   chainId: "0x38",
                //   chainName: "Binance Smart Chain",
                //   nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
                //   rpcUrls: ["https://bsc-dataseed.binance.org/"],
                //   blockExplorerUrls: ["https://bscscan.com/"],
                // },
                {
                    chainId: "0x539",
                    chainName: "127.0.0.1",
                    nativeCurrency: {
                        name: "ETH",
                        symbol: "ETH",
                        decimals: 18,
                    },
                    rpcUrls: ["https://127.0.0.1:7545"],
                    blockExplorerUrls: ["https://etherscan.com/"],
                },
            ],
        });
    },

    initContracts: async function () {
        const betting = await $.getJSON("Betting.json");
        App.contracts.Betting = TruffleContract(betting);
        App.contracts.Betting.setProvider(App.web3Provider);
        
        const token = await $.getJSON("StandardToken.json");
        App.contracts.Token = TruffleContract(token);
        App.contracts.Token.setProvider(App.web3Provider);

        // Hydrate the smart contract with values from the blockchain
        App.Betting = await App.contracts.Betting.deployed();
        App.Token = await App.contracts.Token.deployed();
    },

    bindEvents: async function () {
        $(document)
            .on("click", "#account-link", App.connectWeb3)
            .on("click", "#switch-network", App.switchNetwork)
            .on("click", "#btn-approve", App.approve)
            .on("click", "#btn-create-pool-cancel", App.cancelPoolCreation)
            .on("click", "#btn-create-pool", App.createPool);
    },

    render: async function () {
        // Prevent double render
        if (App.loading) return;
        // Update app loading state
        App.setLoading(true);

        const poolCount = (await App.Betting._poolCount()).toNumber();
        for (var i = 0; i < poolCount; i++) {
            const token = await App.Betting._poolsIndexes(i);
            App.renderPool(token);
        }

        App.setLoading(false);
    },
    renderPool: async function (token) {
        const pool = await App.Betting._pools(token);

        const id = pool[0];
        const name = pool[1];
        const totalPositive = pool[2].toNumber() / 10**18;
        const totalNegative = pool[3].toNumber() / 10**18;

        const totalBet = totalPositive + totalNegative;
        const positivePercent = (totalPositive / totalBet * 100).toFixed(0) + "%";
        const negativePercent = (totalNegative / totalBet * 100).toFixed(0) + "%";

        const $poolTemplate = $(".pool-template").clone();
        $poolTemplate.removeClass("pool-template");
        $poolTemplate.find(".poolId").html(truncate(id));
        $poolTemplate.find(".poolName").html(name);
        $poolTemplate.find(".totalPositive").html(totalPositive.toFixed(4));
        $poolTemplate.find(".totalNegative").html(totalNegative.toFixed(4));
        $poolTemplate.find(".progress-positive").attr("aria-valuenow", positivePercent).css("width", positivePercent).html(positivePercent);
        $poolTemplate.find(".progress-negative").attr("aria-valuenow", negativePercent).css("width", negativePercent).html(negativePercent);
        
        $(".pools-container").append($poolTemplate);

        $("#no-pool").hide();
        $poolTemplate.show();
    },

    approve: async function () {
        let approved = await App.Token.approve(App.Betting.address, -1);
        if(approved) {
            $("#not-approved").hide();
            $("#btn-create-pool-modal").prop("disabled", false);
            $("#btn-create-pool").prop("disabled", false);
            $(".btn-join-positive").prop("disabled", false);
            $(".btn-join-negative").prop("disabled", false);
        }
    },

    createPool: async function () {
        var token = $("#input-token").val();
        var name = $("#input-name").val();
        var positive = $("#input-positive").val() * 10**18;
        var negative = $("#input-negative").val() * 10**18;

        try {
            $("#create-pool-error").hide();
            await App.Betting.createPool(token, name, positive, negative);

            $("#btn-create-pool-cancel").click();
            App.renderPool(token);
            App.refreshWalletTokenAmount();
        }
        catch(error) {
            $("#create-pool-error-message").text(error.message);
            $("#create-pool-error").show();
        }
    },
    cancelPoolCreation: async function () {
        $("#input-token").val("");
        $("#input-name").val("");
        $("#input-positive").val("1000");
        $("#input-negative").val("0");
    },

    testPools: async function () {
        await App.Betting.createPool(0x155040625D7ae3e9caDA9a73E3E44f76D3Ed1409, "Revomon", 1000, 0); //1134.5534535 * 10**18, 347.564777556 * 10**18);
        //await App.Betting.createPool(0xbA2aE424d960c26247Dd6c32edC70B295c744C43, "DOGE", 1432.3543453434 * 10**18, 1118.0984897 * 10**18);
    },


    setLoading: (isLoading) => {
        App.loading = isLoading;
        const $loader = $("#loader");
        const $content = $("#content");
        if (isLoading) {
            $loader.show();
            $content.hide();
        } else {
            $loader.hide();
            $content.show();
        }
    },
};

$(function () {
    $(window).load(function () {
        App.init();
    });
});

function truncate(fullStr, strLen = 8, separator = "...", frontChars = 5, backChars = 4) {
    if (fullStr.length <= strLen)
        return fullStr;
  
    return fullStr.substr(0, frontChars) + separator + fullStr.substr(fullStr.length - backChars);
  }