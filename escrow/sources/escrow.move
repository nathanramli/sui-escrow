module sui_escrow::escrow {
    use sui::tx_context::{Self, TxContext};
    use sui::balance::{Self, Balance};
    use sui::object::{Self, UID};
    use sui::coin::{Self, Coin};
    use sui::transfer;

    struct Escrow<phantom T, phantom Y> has key {
        id: UID,
        offeror: address,
        offered_token: Balance<T>,
        expected_amount: u64,
        expected_token: Balance<Y>,
    }

    fun init(_: &mut TxContext) { }

    public entry fun create_offer<OFFERED_TOKEN, EXPECTED_TOKEN>(
        offered_token: Balance<OFFERED_TOKEN>,
        expected_amount: u64,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        let id = object::new(ctx);

        transfer::share_object(
            Escrow<OFFERED_TOKEN, EXPECTED_TOKEN> {
                id,
                offeror: sender,
                offered_token: offered_token,
                expected_amount: expected_amount,
                expected_token: balance::zero<EXPECTED_TOKEN>(),
            }
        );
    }

    public entry fun take_offer<OFFERED_TOKEN, EXPECTED_TOKEN>(
        escrow: &mut Escrow<OFFERED_TOKEN, EXPECTED_TOKEN>,
        expected_token: Balance<EXPECTED_TOKEN>,
        ctx: &mut TxContext,
    ) {
        assert!(balance::value<EXPECTED_TOKEN>(&expected_token) == escrow.expected_amount, 1);
        transfer::transfer(coin::from_balance<EXPECTED_TOKEN>(expected_token, ctx), escrow.offeror);
        // balance::join<EXPECTED_TOKEN>(&mut escrow.expected_token, expected_token);
    }

    #[test_only]
    struct ANT has drop {}

    #[test_only]
    struct BEE has drop {}


    #[test]
    public fun test_offer_and_take() {
        use sui::test_scenario;
        // use std::debug;
        
        // create test addresses
        let admin = @0xBABE;
        let offeror = @0x0FFE;
        let taker = @0x4CCE;

        let scenario_val = test_scenario::begin(admin);
        let scenario = &mut scenario_val;
        {
            init(test_scenario::ctx(scenario));
            let minted_ant_coin = coin::mint_for_testing<ANT>(1000, test_scenario::ctx(scenario));
            transfer::transfer(minted_ant_coin, offeror);
            transfer::transfer(coin::zero<BEE>(test_scenario::ctx(scenario)), offeror);

            let minted_bee_coin = coin::mint_for_testing<BEE>(1000, test_scenario::ctx(scenario));
            transfer::transfer(minted_bee_coin, taker);
            transfer::transfer(coin::zero<ANT>(test_scenario::ctx(scenario)), taker);
        };
        test_scenario::next_tx(scenario, offeror);
        {
            let ant_coin = test_scenario::take_from_sender<Coin<ANT>>(scenario);
            let offered_ant_coin = coin::split<ANT>(&mut ant_coin, 100, test_scenario::ctx(scenario));
            create_offer<ANT, BEE>(
                coin::into_balance<ANT>(offered_ant_coin),
                1000,
                test_scenario::ctx(scenario)
            );
            assert!(coin::value<ANT>(&mut ant_coin) == 900, 1);
            test_scenario::return_to_sender(scenario, ant_coin);
        };
        test_scenario::next_tx(scenario, taker);
        {
            let escrow = test_scenario::take_shared<Escrow<ANT, BEE>>(scenario);
            assert!(escrow.offeror == offeror, 2);
            assert!(escrow.expected_amount == 1000, 3);

            let bee_coin = test_scenario::take_from_sender<Coin<BEE>>(scenario);
            let taker_bee_coin = coin::split<BEE>(&mut bee_coin, 1000, test_scenario::ctx(scenario));
            take_offer<ANT, BEE>(
                &mut escrow,
                // &mut offeror_bee_coin,
                coin::into_balance<BEE>(taker_bee_coin),
                test_scenario::ctx(scenario));
            let offeror_bee_coin = test_scenario::take_from_address<Coin<BEE>>(scenario, offeror);
            assert!(coin::value<BEE>(&offeror_bee_coin) == 1000, 4);
            test_scenario::return_to_address(offeror, offeror_bee_coin);
            test_scenario::return_to_sender(scenario, bee_coin);
            test_scenario::return_shared<Escrow<ANT, BEE>>(escrow);
            // let ant_coin = test_scenario::take_from_sender<Coin<ANT>>(scenario);
            // let offered_ant_coin = coin::split<ANT>(&mut ant_coin, 100, test_scenario::ctx(scenario));
            // create_offer<ANT, BEE>(
            //     coin::into_balance<ANT>(offered_ant_coin),
            //     1000,
            //     test_scenario::ctx(scenario)
            // );
            // assert!(coin::value<ANT>(&mut ant_coin) == 900, 1);
            // test_scenario::return_to_sender(scenario, ant_coin);
        };
        test_scenario::end(scenario_val);
    }
}