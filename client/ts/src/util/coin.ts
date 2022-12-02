import {
    getTransactionEffects,
    JsonRpcProvider,
    RawSigner,
    SuiMoveObject,
    SuiObject,
} from '@mysten/sui.js';

/***
 * getCoinObjectIdWithAmount is used to get a Coin object with a specific type that probably combine several Coin object to reached a specific amount
 */
export const getCoinObjectIdWithAmount = async (
    provider: JsonRpcProvider,
    signer: RawSigner,
    type: string,
    ownerAddress: string,
    amount: number
) => {
    const dataType = `0x2::coin::Coin<${type}>`;

    const ownedObjects = await provider.getObjectsOwnedByAddress(ownerAddress);
    const objects = await provider.getObjectBatch(
        ownedObjects.map((v) => v.objectId)
    );

    let sum = 0;
    let coinAddresses = new Array<string>();

    for (let i = 0; i < objects.length; i++) {
        const detail = objects[i].details as SuiObject;
        const moveObject = detail.data as SuiMoveObject;
        if (moveObject.type !== dataType) continue;

        sum += moveObject.fields?.balance;
        coinAddresses.push(detail.reference.objectId);
        if (sum >= amount) break;
    }
    if (sum < amount) throw new Error('not enought coin balance');

    if (coinAddresses.length === 1) return coinAddresses[0];

    for (let i = 1; i < coinAddresses.length; i++) {
        const mergeTxn = await signer.mergeCoin({
            primaryCoin: coinAddresses[0],
            coinToMerge: coinAddresses[i],
            gasBudget: 1000,
        });
        console.log(
            'Coin merged tx digest: ',
            getTransactionEffects(mergeTxn)?.transactionDigest
        );
    }
    return coinAddresses[0];
};
