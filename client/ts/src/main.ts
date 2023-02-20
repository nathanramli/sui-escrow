import {
    getTransactionEffects,
    JsonRpcProvider,
    Network,
    RawSigner,
    Secp256k1Keypair,
} from '@mysten/sui.js';
import { getCoinObjectIdWithAmount } from './util/coin';
import { loadKeypair } from './util/keypair';

// --- PLEASE CHANGE IT ACCORDING TO DEPLOYED PACKAGE ADDRESS
const MODULE_OBJECT_ID = '0x04069c3a6e269c56dee83b914eb72c7d108d1c12';

const main = async () => {
    const provider = new JsonRpcProvider(Network.DEVNET);

    const aliceKeypair = await loadKeypair('alice', true);
    // const aliceKeypair = new Secp256k1Keypair();
    console.log('Alice Address: ', aliceKeypair.getPublicKey().toSuiAddress());

    const bobKeypair = await loadKeypair('bob', true);
    // const bobKeypair =  new Secp256k1Keypair();
    console.log('Bob Address: ', bobKeypair.getPublicKey().toSuiAddress());

    // The rate limiter is very strict, request the Sui coin to an address and then distribute it across the addresses

    // const faucetProvider = new JsonRpcProvider("https://fullnode.devnet.sui.io:443/", {
    //     faucetURL: "https://faucetdevnet.sui.io/gas"
    // });

    // await provider.requestSuiFromFaucet(
    //     aliceKeypair.getPublicKey().toSuiAddress()
    // );
    // await provider.requestSuiFromFaucet(
    //     bobKeypair.getPublicKey().toSuiAddress()
    // );

    const aliceSigner = new RawSigner(aliceKeypair, provider);

    const offeredAmount = 100;
    const expectedAmount = 100;
    const offerorCoinObjectId = await getCoinObjectIdWithAmount(
        provider,
        aliceSigner,
        '0x2::sui::SUI',
        aliceKeypair.getPublicKey().toSuiAddress(),
        offeredAmount
    );

    const createOfferTxn = await aliceSigner.executeMoveCall({
        packageObjectId: MODULE_OBJECT_ID,
        module: 'escrow',
        function: 'create_offer',
        typeArguments: ['0x2::sui::SUI', '0x2::sui::SUI'],
        arguments: [offerorCoinObjectId, offeredAmount.toString(), expectedAmount.toString()],
        gasBudget: 1000,
    });

    console.log(
        'Create Offer tx digest: ',
        getTransactionEffects(createOfferTxn)?.transactionDigest
    );

    const sharedObjectId =
        getTransactionEffects(createOfferTxn)?.created![0].reference.objectId;
    if (sharedObjectId === undefined) {
        console.log('Failed to create escrow object!');
        return;
    }

    console.log('Escrow object id: ', sharedObjectId);

    const bobSigner = new RawSigner(bobKeypair, provider);
    const takerCoinObjectId = await getCoinObjectIdWithAmount(
        provider,
        bobSigner,
        '0x2::sui::SUI',
        bobKeypair.getPublicKey().toSuiAddress(),
        expectedAmount
    );

    const takeOfferTxn = await bobSigner.executeMoveCall({
        packageObjectId: MODULE_OBJECT_ID,
        module: 'escrow',
        function: 'take_offer',
        typeArguments: ['0x2::sui::SUI', '0x2::sui::SUI'],
        arguments: [sharedObjectId, takerCoinObjectId],
        gasBudget: 1000,
    });

    console.log(
        'Take Offer tx digest: ',
        getTransactionEffects(takeOfferTxn)?.transactionDigest
    );
};

main();
