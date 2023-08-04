module sui_escrow::escrow {
    use sui::tx_context::{Self, TxContext};
    use sui::balance::{Self, Balance};
    use sui::object::{Self, UID};
    use sui::coin::{Self, Coin};
    use sui::transfer;

    /// Inactive escrow
    const EInactiveEscrow: u64 = 0;

    /// Not enought balance
    const ENotEnoughBalance: u64 = 1;

    struct Escrow<phantom T, phantom Y> has key {
        id: UID,
        offeror: address,
        offered_token: Balance<T>,
        expected_amount: u64,
        active: bool,
    }

    public entry fun create_offer<OFFERED_TOKEN, EXPECTED_TOKEN>(
        offeror_coin: &mut Coin<OFFERED_TOKEN>,
        offered_amount: u64,
        expected_amount: u64,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        let id = object::new(ctx);

        let offered_token = coin::split<OFFERED_TOKEN>(offeror_coin, offered_amount, ctx);

        transfer::share_object(
            Escrow<OFFERED_TOKEN, EXPECTED_TOKEN> {
                id,
                offeror: sender,
                offered_token: coin::into_balance<OFFERED_TOKEN>(offered_token),
                expected_amount: expected_amount,
                active: true,
            }
        );
    }

    public entry fun take_offer<OFFERED_TOKEN, EXPECTED_TOKEN>(
        escrow: &mut Escrow<OFFERED_TOKEN, EXPECTED_TOKEN>,
        taker_coin: &mut Coin<EXPECTED_TOKEN>,
        ctx: &mut TxContext,
    ) {
        assert!(escrow.active != false, EInactiveEscrow);
        assert!(coin::value<EXPECTED_TOKEN>(taker_coin) >= escrow.expected_amount, ENotEnoughBalance);

        let expected_coin = coin::split<EXPECTED_TOKEN>(taker_coin, escrow.expected_amount, ctx);

        let sender = tx_context::sender(ctx);
        transfer::public_transfer(expected_coin, escrow.offeror);
        let offered_token_value = balance::value<OFFERED_TOKEN>(&escrow.offered_token);
        let offered_token = balance::split<OFFERED_TOKEN>(&mut escrow.offered_token, offered_token_value);
        transfer::public_transfer(coin::from_balance<OFFERED_TOKEN>(offered_token, ctx), sender);

        escrow.active = false;

        // shared object deletation is not supported at the moment
        // this will be supported: https://github.com/MystenLabs/sui/issues/2083
        // let Escrow {
        //     id: id,
        //     offeror: offeror,
        //     offered_token: offered_token,
        //     expected_amount: expected_amount,
        // } = escrow;
        
        // object::delete(id);
    }

    #[test_only]
    struct CANDY has drop {}

    #[test_only]
    struct PIE has drop {}


    #[test]
    public fun test_offer_and_take() {
        use sui::test_scenario;
        // use std::debug;
        use std::vector;
        
        // create test addresses
        let admin = @0xBABE;
        let offeror = @0x0FFE;
        let taker = @0x4CCE;

        let scenario_val = test_scenario::begin(admin);
        let scenario = &mut scenario_val;
        {
            let minted_candy_coin = coin::mint_for_testing<CANDY>(1000, test_scenario::ctx(scenario));
            transfer::public_transfer(minted_candy_coin, offeror);
            let minted_pie_coin = coin::mint_for_testing<PIE>(20, test_scenario::ctx(scenario));
            transfer::public_transfer(minted_pie_coin, offeror);

            let minted_pie_coin = coin::mint_for_testing<PIE>(1000, test_scenario::ctx(scenario));
            transfer::public_transfer(minted_pie_coin, taker);
        };
        test_scenario::next_tx(scenario, offeror);
        {
            let candy_coin = test_scenario::take_from_sender<Coin<CANDY>>(scenario);
            create_offer<CANDY, PIE>(
                &mut candy_coin,
                100,
                1000,
                test_scenario::ctx(scenario)
            );
            assert!(coin::value<CANDY>(&mut candy_coin) == 900, 2);
            test_scenario::return_to_sender(scenario, candy_coin);
        };
        test_scenario::next_tx(scenario, taker);
        {
            let escrow = test_scenario::take_shared<Escrow<CANDY, PIE>>(scenario);
            assert!(escrow.active == true, 1);
            assert!(escrow.offeror == offeror, 2);
            assert!(escrow.expected_amount == 1000, 3);

            let pie_coin = test_scenario::take_from_sender<Coin<PIE>>(scenario);
            take_offer<CANDY, PIE>(
                &mut escrow,
                &mut pie_coin,
                test_scenario::ctx(scenario));
            test_scenario::return_to_sender(scenario, pie_coin);
            assert!(escrow.active == false, 4);
            test_scenario::return_shared<Escrow<CANDY, PIE>>(escrow);
        };
        test_scenario::next_tx(scenario, admin);
        {
            let ids = test_scenario::ids_for_address<Coin<PIE>>(offeror);
            
            let sum = 0;
            while (!vector::is_empty(&ids)) {
                let id = vector::pop_back(&mut ids);
                let offeror_pie_coin = test_scenario::take_from_address_by_id<Coin<PIE>>(
                    scenario,
                    offeror,
                    id);
                sum = sum + coin::value<PIE>(&offeror_pie_coin);
                test_scenario::return_to_address(offeror, offeror_pie_coin);
            };
            assert!(sum == 1020, 4);
        };
        test_scenario::end(scenario_val);
    }
}