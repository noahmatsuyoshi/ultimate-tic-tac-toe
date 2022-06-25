function FinalOption(props) {
    return (
        <div className='menu-cell menu-cell-last'>
            <div className="small-text-label">
                Help keep the website running!
            </div>
            <form action="https://www.paypal.com/donate" className="form" method="post" target="_top">
                <input type="hidden" name="business" value="KS5D92VSHFACU" />
                <input type="hidden" name="item_name" value="Keeping ultimatetictactoe.net online" />
                <input type="hidden" name="currency_code" value="USD" />
                <input type="image" src="https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif" border="0" name="submit" title="PayPal - The safer, easier way to pay online!" alt="Donate with PayPal button" />
                <img alt="" border="0" src="https://www.paypal.com/en_US/i/scr/pixel.gif" width="1" height="1" />
            </form>
        </div>
    )
}