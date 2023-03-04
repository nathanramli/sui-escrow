## Coin Escrow on Sui

This module allows two people to do an escrow transaction. The offeror will start the escrow process by offering a coin and then defining the expected coin amount. Eventually, the taker of the offer will be sent exactly the same number of expected coins and then the offered coin will be given to the taker of the offer.

### Quick start
Make sure you have installed all the required tools that mentioned here https://docs.sui.io/devnet/build.
1. Go to the `escrow` directory and then run `sui move test` to test the code.
2. To build the binary files, we can run `sui move build`. After the build success 
3. To publish the current package please run `sui client publish --path . --gas-budget 1000`. After it published you can see in your terminal there's a **Transaction Effects** section that telling the object ID of the Created Objects. That object ID will be the package address. So make sure you keep it somewhere.
4. And then open `main.ts` in the `client/ts/src` directory. Change the `MODULE_OBJECT_ID` to your published package address.
5. And then run `npm start` on the `client/ts` directory. You will see Alice address and Bob address in your terminal. You need to fund this address before able to run the scripts successfully (here's how to get SUI tokens on Devnet https://docs.sui.io/devnet/build/install#sui-tokens). And then run the `npm start` once again. That's it!


### How to run escrow on Local network
1. Make sure you have initialized your sui client by running `sui client`.

2. Next, you need to add at least two addresses. We will take the second and third address of the local wallet as the addresses of Alice and Bob. After adding them, you can also check all the addresses like below.
    ```
    sui client new-address <KEY_SCHEME>
    sui client new-address <KEY_SCHEME>
    sui client addresses
    ```
3. Then, we can create a network in the local environment according to the [office document](https://docs.sui.io/build/sui-local-network). If the environment has already been established, you need to execute `sui genesis --force` again to ensure that the addresses you just created can get the faucet on the local network.

4. Finally, after you execute `sui client switch --env localnet` to switch to the local environment, you can run escrow following the [quick start](#quick-start) steps. However, when you are on the local network and build the environment according to the above, you can omit the part of manual funding addresses in the fifth step of the [quick start](#quick-start).