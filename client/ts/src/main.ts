import {
    getTransactionEffects,
    JsonRpcProvider,
    localnetConnection,
    devnetConnection,
    RawSigner,
} from '@mysten/sui.js';
import * as child from 'child_process';
import { getCoinObjectIdWithAmount } from './util/coin';
import { loadKeypair } from './util/keypair';
import { localWallet } from './util/wallet';
import type { Keypair } from '@mysten/sui.js';

// --- PLEASE CHANGE IT ACCORDING TO DEPLOYED PACKAGE ADDRESS
const MODULE_OBJECT_ID = '0x78c29e4025eae407c016edaa17118f03021fbccb';

const main = async () => {
    const connection = {
        localnet: localnetConnection,
        devnet: devnetConnection,
    };

    const currentNetwork = child
        .execSync('sui client active-env')
        .toString()
        .trim();
    const choiceNetwork: keyof typeof connection = currentNetwork as any;
    console.log('Current Network', choiceNetwork);

    const provider = new JsonRpcProvider(connection[choiceNetwork]);

    let aliceKeypair: Keypair;
    let bobKeypair: Keypair;

    if (choiceNetwork === 'devnet') {
        aliceKeypair = await loadKeypair('alice', 'ED25519', true);
        console.log(
            'Alice Address: ',
            aliceKeypair.getPublicKey().toSuiAddress()
        );
        bobKeypair = await loadKeypair('bob', 'ED25519', true);
        console.log('Bob Address: ', bobKeypair.getPublicKey().toSuiAddress());

        // [Devnet] The rate limiter is very strict, request the Sui coin to an address and then distribute it across the addresses
        await provider.requestSuiFromFaucet(
            aliceKeypair.getPublicKey().toSuiAddress()
        );
        await provider.requestSuiFromFaucet(
            bobKeypair.getPublicKey().toSuiAddress()
        );
    } else {
        aliceKeypair = await localWallet(1);
        console.log(
            'Alice Address: ',
            aliceKeypair.getPublicKey().toSuiAddress()
        );
        bobKeypair = await localWallet(2);
        console.log('Bob Address: ', bobKeypair.getPublicKey().toSuiAddress());
    }

    const aliceSigner = new RawSigner(aliceKeypair, provider);

    const offeredAmount = 1000;
    const expectedAmount = 1000;
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
        arguments: [
            offerorCoinObjectId,
            offeredAmount.toString(),
            expectedAmount.toString(),
        ],
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
